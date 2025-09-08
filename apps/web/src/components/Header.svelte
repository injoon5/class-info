<script lang="ts">

    const links = [
        { to: "/", label: "Home" },
        { to: "/todos", label: "Todos" },
    ];

</script>

<div>
	<div class="flex flex-row items-center justify-between px-4 py-2 md:px-6">
		<nav class="flex gap-4 text-lg">
			{#each links as link (link.to)}
				<a
					href={link.to}
					class=""
				>
					{link.label}
				</a>
			{/each}
		</nav>
		<div class="flex items-center gap-2">
		</div>
	</div>
	<hr class="border-neutral-800" />
</div>
