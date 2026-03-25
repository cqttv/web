<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
	import * as Select from "$lib/components/ui/select/index.js";
	import Plus from "@lucide/svelte/icons/plus";
	import Trash2 from "@lucide/svelte/icons/trash-2";
	import type { SearchCriterion, SearchFilter } from "$lib/twitch/logs";

	type CriterionType = "regex" | "text" | "user" | "channel" | "badge";

	interface BadgeOption {
		id: string;
		title: string;
		imageUrl: string;
	}

	interface Props {
		filter?: SearchFilter;
		availableBadges?: BadgeOption[];
		onFilterChange?: (filter: SearchFilter) => void;
	}

	let { filter = { criteria: [] }, availableBadges = [], onFilterChange }: Props = $props();

	let criteria: SearchCriterion[] = $state([...filter.criteria]);

	const criterionTypeLabels: Record<CriterionType, string> = {
		regex: "Regex",
		text: "Text",
		user: "User",
		channel: "Channel",
		badge: "Badge",
	};

	const addCriterion = (type: CriterionType = "text") => {
		const nextId = Math.max(...criteria.map((c) => parseInt(c.id)), -1) + 1;
		const newCriterion: SearchCriterion = {
			id: String(nextId),
			type,
			value: "",
			operator: criteria.length > 0 ? "AND" : undefined,
		};
		criteria = [...criteria, newCriterion];
		emitChange();
	};

	const removeCriterion = (id: string) => {
		criteria = criteria.filter((c) => c.id !== id);
		if (criteria.length > 0) {
			criteria[0].operator = undefined; // First criterion doesn't have an operator
		}
		emitChange();
	};

	const updateCriterion = (id: string, updates: Partial<SearchCriterion>) => {
		const index = criteria.findIndex((c) => c.id === id);
		if (index !== -1) {
			criteria[index] = { ...criteria[index], ...updates };
			emitChange();
		}
	};

	const updateCriterionType = (id: string, type: CriterionType) => {
		const index = criteria.findIndex((c) => c.id === id);
		if (index !== -1) {
			criteria[index] = {
				...criteria[index],
				type,
			};
			emitChange();
		}
	};

	const emitChange = () => {
		onFilterChange?.({ criteria });
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
			addCriterion();
		}
	};
</script>

<div class="space-y-3 rounded-lg border border-border bg-background p-3">
	<div class="flex items-center justify-between">
		<Label class="text-sm font-semibold">Search Filters</Label>
		<Button
			size="sm"
			variant="outline"
			onclick={() => addCriterion()}
			onkeydown={handleKeydown}
			title="Add criterion (Ctrl+Enter)"
			class="h-7"
		>
			<Plus class="mr-1 size-3" />
			Add Filter
		</Button>
	</div>

	<div class="space-y-2">
		{#each criteria as criterion, index (criterion.id)}
			<div class="flex items-center gap-2">
				{#if index > 0}
					<div class="w-12">
						<Select.Root
							type="single"
							value={criterion.operator || "AND"}
							onValueChange={(v) => updateCriterion(criterion.id, { operator: v as "AND" | "OR" })}
						>
							<Select.Trigger class="h-8 w-full border">
								<span class="text-xs">{criterion.operator || "AND"}</span>
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="AND" label="AND" />
								<Select.Item value="OR" label="OR" />
							</Select.Content>
						</Select.Root>
					</div>
				{:else}
					<div class="w-12"></div>
				{/if}

				<Select.Root
					type="single"
					value={criterion.type}
					onValueChange={(v) => updateCriterionType(criterion.id, v as CriterionType)}
				>
					<Select.Trigger class="h-8 w-24 border">
						{criterionTypeLabels[criterion.type]}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="regex" label="Regex" />
						<Select.Item value="text" label="Text" />
						<Select.Item value="user" label="User" />
						<Select.Item value="channel" label="Channel" />
						<Select.Item value="badge" label="Badge" />
					</Select.Content>
				</Select.Root>

				<Select.Root
					type="single"
					value={criterion.negate ? "NOT" : ""}
					onValueChange={(v) => updateCriterion(criterion.id, { negate: v === "NOT" })}
				>
					<Select.Trigger class="h-8 w-16 border text-xs">
						{criterion.negate ? "NOT" : ""}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="" label="" />
						<Select.Item value="NOT" label="NOT" />
					</Select.Content>
				</Select.Root>

				{#if criterion.type === "badge" && availableBadges.length > 0}
					<div class="relative flex-1">
						<Select.Root
							type="multiple"
							value={criterion.value ? criterion.value.split(',').filter(Boolean) : []}
							onValueChange={(v: string[]) => updateCriterion(criterion.id, { value: v.join(',') })}
						>
							<Select.Trigger class="h-8 flex-1 border">
								<div class="flex items-center gap-1 flex-wrap">
									{#each (criterion.value ? criterion.value.split(',').filter(Boolean) : []) as badgeId (badgeId)}
										{@const badge = availableBadges.find(b => b.id === badgeId)}
										{#if badge}
											<img src={badge.imageUrl} alt={badge.title} class="h-4 w-4" />
											<span class="text-xs truncate">{badge.title}</span>
										{/if}
									{/each}
									{#if !criterion.value || criterion.value.split(',').filter(Boolean).length === 0}
										<span class="text-muted-foreground">Select badges...</span>
									{/if}
								</div>
							</Select.Trigger>
							<Select.Content class="max-h-[300px] overflow-y-auto">
								{#each availableBadges as badge (badge.id)}
									<Select.Item value={badge.id} label={badge.title}>
										<div class="flex items-center gap-2">
											<img src={badge.imageUrl} alt={badge.title} class="h-4 w-4" />
											<span>{badge.title}</span>
										</div>
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				{:else}
					<Input
						bind:value={criterion.value}
						onchange={() => emitChange()}
						placeholder={criterion.type === "badge" ? "e.g., moderator,subscriber" : "Enter value"}
						class="h-8 flex-1 border"
						onkeydown={handleKeydown}
					/>
				{/if}

				<Button
					size="icon"
					variant="ghost"
					onclick={() => removeCriterion(criterion.id)}
					title="Remove criterion"
					class="h-8 w-8 border"
				>
					<Trash2 class="size-4" />
				</Button>
			</div>
		{/each}
	</div>

	{#if criteria.length === 0}
		<p class="py-2 text-center text-sm text-muted-foreground">No filters added. Click "Add Filter" to get started.</p>
	{/if}
</div>
