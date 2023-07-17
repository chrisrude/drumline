<header>
	<div class="logo_container">
		<div class="logo">drumline</div>
	</div>
</header>

<style>
	header {
		display: flex;
		justify-content: space-between;
	}

	.logo_container {
		-webkit-mask-image: -webkit-gradient(
			linear,
			left top,
			left bottom,
			from(rgba(0, 0, 0, 0.3)),
			to(rgba(0, 0, 0, 0.8))
		);
		mask-image: linear-gradient(to top, rgba(0, 0, 0, 0.3) 100%, transparent 20%);
		z-index: -1;
		bottom: 0;
		left: 0;
		right: 0;
		position: absolute;
		background-attachment: fixed;
		background-color: var(--color-bg-1);
	}

	.logo {
		font-size: 16.6vw;
		font-weight: 800;
		text-transform: uppercase;
		background-image: url($lib/images/drumline.png);
		background-position: bottom;
		background-size: contain;
		background-clip: text;
		text-align: center;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		line-height: 0.7em;
	}

	@supports (background-image: -webkit-image-set(url($lib/images/drumline.webp) 1x)) {
		.logo {
			background-image: -webkit-image-set(url($lib/images/drumline.webp) 1x);
		}
	}
</style>
