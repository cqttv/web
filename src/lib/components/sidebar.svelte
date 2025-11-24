<script lang="ts">
	import { ScrollIcon, HeartIcon, SparklesIcon, FlameIcon } from "@lucide/svelte";

	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { page } from "$app/state";
</script>

<Sidebar.Root>
	<Sidebar.Header class="items-center">
		<div class="flex items-center">
			<SparklesIcon class="absolute left-4" fill="#cba6f7" color="#cba6f7" />
			<div class="my-2 flex flex-col leading-none">
				<p class="text-l">Twitch Utilities</p>
			</div>
		</div>
	</Sidebar.Header>
	<hr />
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel>Chat</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					<Sidebar.MenuItem>
						<Sidebar.MenuButton isActive={page.url.pathname === "/logs"}>
							{#snippet child({ props })}
								<a href="/logs" {...props}>
									<ScrollIcon />
									<span>Logs</span>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>

					<Sidebar.MenuItem>
						<Sidebar.MenuButton isActive={page.url.pathname === "/firehose"}>
							{#snippet child({ props })}
								<a href="/firehose" {...props}>
									<FlameIcon />
									<span>Firehose</span>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
	<hr />
	<Sidebar.Footer class="text-xs opacity-60">
		<p>
			<a href="https://github.com/supatv/web" target="_blank" rel="nofollow">
				&copy; {new Date().getFullYear()} supa.sh
				<HeartIcon fill="#cba6f7" color="#cba6f7" class="inline size-4" />
			</a>
		</p>
	</Sidebar.Footer>
</Sidebar.Root>
