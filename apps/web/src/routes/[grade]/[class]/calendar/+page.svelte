<script lang="ts">
// Renders the school calendar page within the class context (keeps class nav).
import Calendar from '../../../calendar/+page.svelte';
let { data }: { data: any } = $props();
</script>

<Calendar {data} />
