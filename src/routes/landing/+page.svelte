<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import TextTransitioner from '$lib/TextTransitioner.svelte';

	let prefix = 'Hello, I am ';
	let word = writable('QuinnDT');
	let append = writable("")
	// This is purposefully not a reactive variable.
	// It should remain as it is after initial load.
	let introductionLength = prefix.length + $word.length - 2;

	function sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	onMount(async () => {
		await sleep(5000);
		$word = "sometimes just 'Quinn',";
		$append = "a person."
		await sleep(5000);
		$word = "a person.";
		$append = "Nice to meet you"
	});
</script>

<!-- background -->
<div class="bg-gradient-fill" />

<!-- Some text in the middle. -->
<div class="mono introduction" style="--introduction-text-length: {introductionLength}">
	{prefix}
	<span class="mono word">
		<TextTransitioner linkedText={word} />
	</span><br />
	<TextTransitioner linkedText={append} />
</div>

<style lang="css">
	@import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@600&display=swap');
	@import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400&display=swap');
	.bg-gradient-fill {
		background: linear-gradient(37deg, #4882ff 0%, #00ff88 100%);
		/* Fill all the way from top to bottom; left to right. */
		width: 100vw;
		height: 100vh;
		/* Never move on screen; Have 0px above and 0px to the left of it. */
		position: fixed;
		left: 0px;
		top: 0px;
		/* Go behind everything */
		z-index: -100;
	}
	.introduction {
		margin-top: calc(50vh - 2rem);
		margin-left: calc(50vw - var(--introduction-text-length) * 0.5rem);
		padding-top: 1rem;
		text-align: left;
	}
	.mono {
		font-size: x-large;
		font-family: 'Roboto Mono', monospace;
		font-weight: 400;
	}
	.word {
		font-weight: 600;
	}
</style>
