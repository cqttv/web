import { type Component } from "svelte";
import fuzzysort from "fuzzysort";

export type Message = {
	text: string;
	displayName: string;
	channel?: string;
	timestamp: string;
	id: string;
	tags: {
		[key: string]: string;
	};
};

export type TMIEmote = {
	id: string;
	pos: number[];
};

export type ChatComponents = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	type: Component<any>;
	props: object;
}[];

export type EmoteProps = {
	url: string;
	src: string;
};

export type BadgeProps = {
	url: string;
	title: string;
};

export type SearchCriterion = {
	id: string;
	type: "regex" | "text" | "user" | "channel" | "badge";
	value: string;
	operator?: "AND" | "OR"; // operator before this criterion
	negate?: boolean; // for NOT logic
};

export type SearchFilter = {
	criteria: SearchCriterion[];
};

// Serialize filter to URL-safe string
export const serializeFilter = (filter: SearchFilter): string => {
	return btoa(JSON.stringify(filter));
};

// Deserialize filter from URL-safe string
export const deserializeFilter = (encoded: string): SearchFilter => {
	try {
		return JSON.parse(atob(encoded));
	} catch {
		return { criteria: [] };
	}
};

const searchPrefixes: Record<string, (searchString: string, chatLogs: Message[]) => Message[]> = {
	regex(searchString, chatLogs) {
		try {
			const regex = new RegExp(searchString, "i");
			return chatLogs.filter((msg) => regex.test(msg.text));
		} catch {
			return [];
		}
	},
	in(searchString, chatLogs) {
		const channels = searchString
			.toLowerCase()
			.split(",")
			.map((c) => c.trim());
		return chatLogs.filter((msg) => channels.includes(msg.channel?.toLowerCase() ?? ""));
	},
	from(searchString, chatLogs) {
		const users = searchString
			.toLowerCase()
			.split(",")
			.map((u) => u.trim());
		return chatLogs.filter((msg) => users.includes(msg.displayName.toLowerCase()));
	},
};

type SearchPrefixKey = keyof typeof searchPrefixes;

/**
 * Evaluates a single search criterion against a message.
 * @param criterion The search criterion to evaluate.
 * @param message The message to test against.
 * @returns True if the criterion matches, false otherwise.
 */
const evaluateCriterion = (criterion: SearchCriterion, message: Message): boolean => {
	const evaluators: Record<SearchCriterion["type"], (value: string, msg: Message) => boolean> = {
		regex: (value, msg) => {
			try {
				const regex = new RegExp(value, "i");
				return regex.test(msg.text);
			} catch {
				return false;
			}
		},
		text: (value, msg) => msg.text.toLowerCase().includes(value.toLowerCase()),
		user: (value, msg) => {
			const users = value.toLowerCase().split(",").map((u) => u.trim());
			return users.includes(msg.displayName.toLowerCase());
		},
		channel: (value, msg) => {
			const channels = value.toLowerCase().split(",").map((c) => c.trim());
			return channels.includes(msg.channel?.toLowerCase() ?? "");
		},
		badge: (value, msg) => {
			const badges = value.toLowerCase().split(",").map((b) => b.trim());
			const messageBadges = msg.tags["badges"]?.split(",").map((b) => b.split("/")[0].toLowerCase()) ?? [];
			return badges.some((badge) => messageBadges.includes(badge));
		},
	};

	const evaluator = evaluators[criterion.type];
	if (!evaluator) return false;

	const result = evaluator(criterion.value, message);
	return criterion.negate ? !result : result;
};

/**
 * Groups search criteria into OR groups based on their operators.
 * Criteria are grouped where consecutive ANDs are in the same group, and OR starts a new group.
 * @param criteria The list of search criteria.
 * @returns An array of criterion groups, where each group should be ANDed together, and groups ORed.
 */
const groupCriteriaByOr = (criteria: SearchCriterion[]): SearchCriterion[][] => {
	const groups: SearchCriterion[][] = [];
	for (const criterion of criteria) {
		if (groups.length === 0 || criterion.operator === "OR") {
			groups.push([criterion]);
		} else {
			groups[groups.length - 1].push(criterion);
		}
	}
	return groups;
};

/**
 * Evaluates whether a message matches the given search filter.
 * The filter uses AND/OR logic: criteria are grouped by OR operators, with AND within groups.
 * @param filter The search filter containing criteria.
 * @param message The message to evaluate.
 * @returns True if the message matches the filter, false otherwise.
 */
const messageMatchesFilter = (filter: SearchFilter, message: Message): boolean => {
	if (!filter.criteria.length) return true;

	const orGroups = groupCriteriaByOr(filter.criteria);

	// Evaluate each OR group (AND within groups)
	for (const group of orGroups) {
		let groupMatches = true;
		for (const criterion of group) {
			if (!evaluateCriterion(criterion, message)) {
				groupMatches = false;
				break;
			}
		}
		if (groupMatches) return true;
	}

	return false;
};

/**
 * Performs advanced message search using a structured filter.
 * @param filter The search filter with criteria.
 * @param chatLogs The array of messages to search.
 * @param scrollFromBottom Whether to reverse the order for bottom-scrolling.
 * @returns The filtered array of messages.
 */
export const advancedMessageSearch = (filter: SearchFilter, chatLogs: Message[], scrollFromBottom: boolean | null): Message[] => {
	if (!filter.criteria.length) {
		return scrollFromBottom === false ? [...chatLogs].reverse() : chatLogs;
	}

	const results = chatLogs.filter((msg) => messageMatchesFilter(filter, msg));
	return scrollFromBottom === false ? [...results].reverse() : results;
};

/**
 * Performs basic message search using prefixes or fuzzy search.
 * @param searchValue The search string.
 * @param chatLogs The array of messages to search.
 * @param scrollFromBottom Whether to reverse the order for bottom-scrolling.
 * @returns The filtered array of messages.
 */
export const messageSearch = (searchValue: string, chatLogs: Message[], scrollFromBottom: boolean | null): Message[] => {
	const searchKey = searchValue.split(":", 1)[0].toLowerCase();
	const searchString = searchValue.slice(searchKey.length + 1);

	if (searchKey in searchPrefixes && searchString) {
		chatLogs = searchPrefixes[searchKey as SearchPrefixKey](searchString, chatLogs);
	} else if (searchValue) {
		const searchOptions = scrollFromBottom === null
			? { keys: ["channel", "displayName", "text"], threshold: 0.5 }
			: { keys: ["displayName", "text"], threshold: 0.5, limit: 5000 };

		chatLogs = fuzzysort
			.go(searchValue, chatLogs, searchOptions)
			.map((x) => x.obj)
			.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
	}

	return scrollFromBottom === false ? [...chatLogs].reverse() : chatLogs;
};
