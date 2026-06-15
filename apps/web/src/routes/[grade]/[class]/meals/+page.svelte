<script lang="ts">
// Renders the school meals page within the class context (keeps class nav).
import Meals from '../../../meals/+page.svelte';
let { data }: { data: any } = $props();
</script>

<Meals {data} />
