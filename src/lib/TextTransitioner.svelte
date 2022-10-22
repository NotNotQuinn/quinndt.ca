<script lang="ts">
	import type { Writable } from 'svelte/store';
	import { onMount } from 'svelte';

	// Honestly this code is a mess, but it works!
	// I did some math shit, I don't think I needed to.
	// It only makes it harder to understand and refactor.
	// (but it also makes me feel better about how well it works)

	/**
	 * The store holding the text to show and transition with changes.
	 */
	export let linkedText: Writable<string> | null = null;

	/**
	 * The number of frames each transition will take
	 */
	export let frameCount: number = 100;

	/**
	 * If true, the random simulation will play out for longer than
	 * the specified frame count if needed.
	 */
	export let alwaysFinishSimulation = true;

	/**
	 * The number of characters that constitutes a change.
	 *
	 * i.e. a value of `5` indicates that every for every 5 characters,
	 * one change will occur per frame.
	 *
	 * If there are no characters, an action may still occur.
	 */
	export let charactersPerAction = 5;

	/**
	 * The set of characters to pick from while transitioning.
	 *
	 * Default: `~!@#$%^&*()_+-={}[]\\|,.<>/?;:`
	 */
	export let cutset = '~!@#$%^&*()_+-={}[]\\|,.<>/?;:';

	/**
	 * The text being displayed at any current moment.
	 */
	let currentText = '';

	/**
	 * The requestID of the next scheduled animation frame from requestAnimationFrame()
	 */
	let scheduledAnimationFrame: number|null = null;

	// deobfuscated from: https://stackoverflow.com/questions/26079643/pick-random-items-from-javascript-array-without-duplicates#26079683
	function shuffle(arr: any[]){
		let randIndex;
		let tmp;
		let i = arr.length;

		while (i != 0) {
			randIndex = Math.floor(Math.random() * i);

			i--;
			tmp = arr[i];
			arr[i] = arr[randIndex];
			arr[randIndex] = tmp ;
		}

		return arr
	};

	/**
	 * Starts a transition from the currently displayed text to `targetText`.
	 * Cancels the current transition if there is one.
	 *
	 * For documentation of all optional parameters, refer to the component.
	 *
	 * @param targetText The text to transition into.
	 * @param cutset_ Refer to the component documentation.
	 * @param frameCount_ Refer to the component documentation.
	 * @param charactersPerAction_ Refer to the component documentation.
	 * @param alwaysFinishSimulation_ Refer to the component documentation.
	 */
	function startTransition(
		targetText: string,
		cutset_ = cutset,
		frameCount_ = frameCount,
		charactersPerAction_ = charactersPerAction,
		alwaysFinishSimulation_ = alwaysFinishSimulation
	) {
		// Clear the previous transition
		if (scheduledAnimationFrame != null) {
			cancelAnimationFrame(scheduledAnimationFrame)
		}

		if (targetText != $linkedText) {
			linkedText?.set(targetText);
		}

		/**
		 * Shows which letters have been effected in which ways similar to how a bitmap would.
		 * Follows a model similar to a state machine.
		 *
		 * ### States
		 *
		 * ```js
		 * "u" = untouched
		 * "t" = touched
		 * "c" = correct letter
		 * ```
		 */
		let letterFlags = "u".repeat(currentText.length);
		const frames = frameCount_;
		let currentFrame = 0;
		const tt_chance = 0.50; // t -> t
		const lc_chance = 0.2; // length change

		let continueTransition = () => {
			// The probabilities for certain actions occurring is based on a (x,y) plot where all
			// units are in between 0 and 1.
			// Progress it the X dimension. This allows for different chances over the course
			// of the transition.
			// This may be a round-about way to achieve the effect, but it works!
			// and it is also the best format (in my current opinion) to modify.
			const progress = currentFrame/frames;

			// Length change chance: arc that hits hits points (0, 0) and (0.5, lc_chance) and (1, 0)
			// desmos: y=-a\left(2x-1\right)^{2}+a
			let lengthChangeChance = -lc_chance*((2*progress-1)**2) + lc_chance;

			// This is for the situation where progress goes passed 100%,
			// making length change not possible, and the length still needs to change.
			if (lengthChangeChance <= 0) lengthChangeChance = lc_chance;

			const possibilities: { source: string, new: string, prob: number }[] = [
				// u -> c: constant chance
				// desmos: y=0.05
				{ source: "u", new: "c", prob: 0.05 },
				// u -> t: inverse of t->c
				// desmos: y=1-\left(\left(x+0.2\right)^{2}-0.04\right)
				{ source: "u", new: "t", prob: ((1-progress+0.2)**2 - 0.04) },
				// t -> t: linearly up from 0 until it hits tt_chance at 50%, then linearly downwards towards 0.
				// desmos: y=c-\left|2cx-c\right|
				{ source: "t", new: "t", prob: tt_chance - Math.abs(2*tt_chance*progress - tt_chance) },
				// t -> c: exponential curve. at 0% it is 0.00. at 100% it is at 1.40
				// desmos: y=\left(x+0.2\right)^{2}-0.04
				{ source: "t", new: "c", prob: (progress+0.2)**2 - 0.04 },
			];

			const actionsThisFrame = Math.floor(currentText.length/charactersPerAction_) + 1;
			for (let i = 0; i < actionsThisFrame; i++) {
				// Calculate the weighted probability of each action.
				let totalSum = possibilities.map(i => i.prob).reduce((p, c) => p+c)
				let currentSum = 0;
				let rand = Math.random()*totalSum;

				let sourceFlag, newFlag;
				for (let i2 = 0; i2 < possibilities.length; i2++) {
					if (possibilities[i2].prob < 0) continue;

					currentSum += possibilities[i2].prob;
					if (rand <= currentSum) {
						// This possibility has just happened!
						sourceFlag = possibilities[i2].source;
						newFlag = possibilities[i2].new;
						break;
					}
				}

				// Now pick random letters that meet the criteria, and decide what to do with them.
				let shouldChangeLength = lengthChangeChance > Math.random();

				// Go through the indexes in a random order.
				let indexes: number[] = shuffle(Array(letterFlags.length).fill(null).map((x,i)=>i));
				let replaceIndex , originalFlag;
				for (let i2 = 0 ; i2 < indexes.length; i2++) {
					replaceIndex = indexes[i2]
					originalFlag = letterFlags[replaceIndex]
					if (originalFlag == sourceFlag) break;
				}

				if (typeof replaceIndex != "number") {
					// Dont add a character.
					replaceIndex = 0;
					if (!shouldChangeLength)
						newFlag = "";
				}

				let newChar;
				switch (newFlag) {
					case "t": newChar = cutset_.charAt(Math.floor(Math.random()*cutset_.length));
					break;
					case "c": newChar = targetText.charAt(replaceIndex);
					break;
					case "": newChar = "";
					break;
					default: throw new Error("newFlag value not proper: should be 't', 'c' or an empty string")
				}

				if (targetText.length == currentText.length) {
					// Do not change length!
					shouldChangeLength = false;
					if (targetText.length == 0) {
						// No changes can be made
						break;
					}
				}

				if (shouldChangeLength) {
					if (targetText.length > currentText.length) {
						// add a character
						letterFlags = letterFlags.slice(0, replaceIndex) + newFlag.repeat(letterFlags.slice(replaceIndex).length + 1)
						currentText = currentText.slice(0, replaceIndex) + newChar + currentText.slice(replaceIndex)
					} else {
						// remove a character
						letterFlags = letterFlags.slice(0, replaceIndex) + newFlag.repeat(letterFlags.slice(replaceIndex + 1).length)
						currentText = currentText.slice(0, replaceIndex) + currentText.slice(replaceIndex + 1)
					}
				} else {
					// replace a character
					letterFlags = letterFlags.slice(0, replaceIndex) + newFlag + letterFlags.slice(replaceIndex + 1)
					currentText = currentText.slice(0, replaceIndex) + newChar + currentText.slice(replaceIndex + 1)
				}
			}

			if (++currentFrame == frameCount_ && !alwaysFinishSimulation_ || currentText == targetText) {
				currentText = targetText;
				scheduledAnimationFrame = null;
				return;
			}

			scheduledAnimationFrame = requestAnimationFrame(continueTransition);
		};

		scheduledAnimationFrame = requestAnimationFrame(continueTransition);
	}

	onMount(() => {
		if (linkedText) linkedText.subscribe(startTransition);
	});
</script>

{currentText}
