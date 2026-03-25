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

// Test a single criterion against a message
const testCriterion = (criterion: SearchCriterion, msg: Message): boolean => {
	let result = false;

	switch (criterion.type) {
		case "regex": {
			try {
				const regex = new RegExp(criterion.value, "i");
				result = regex.test(msg.text);
			} catch {
				result = false;
			}
			break;
		}
		case "text": {
			result = msg.text.toLowerCase().includes(criterion.value.toLowerCase());
			break;
		}
		case "user": {
			const users = criterion.value
				.toLowerCase()
				.split(",")
				.map((u) => u.trim());
			result = users.includes(msg.displayName.toLowerCase());
			break;
		}
		case "channel": {
			const channels = criterion.value
				.toLowerCase()
				.split(",")
				.map((c) => c.trim());
			result = channels.includes(msg.channel?.toLowerCase() ?? "");
			break;
		}
		case "badge": {
			const badges = criterion.value
				.toLowerCase()
				.split(",")
				.map((b) => b.trim());
			const msgBadges = msg.tags["badges"]?.split(",").map((b) => b.split("/")[0].toLowerCase()) ?? [];
			result = badges.some((badge) => msgBadges.includes(badge));
			break;
		}
	}

	return criterion.negate ? !result : result;
};

export const advancedMessageSearch = (filter: SearchFilter, chatLogs: Message[], scrollFromBottom: boolean | null): Message[] => {
	if (!filter.criteria.length) return scrollFromBottom === false ? [...chatLogs].reverse() : chatLogs;

	const results = chatLogs.filter((msg) => {
		// Group criteria by OR operators (AND has higher precedence)
		const orGroups: SearchCriterion[][] = [];
		for (const criterion of filter.criteria) {
			if (orGroups.length === 0 || criterion.operator === "OR") {
				orGroups.push([criterion]);
			} else {
				orGroups[orGroups.length - 1].push(criterion);
			}
		}

		// Evaluate each OR group (AND within groups)
		let result = false;
		for (const group of orGroups) {
			let groupResult = true;
			for (const criterion of group) {
				const testResult = testCriterion(criterion, msg);
				groupResult = groupResult && testResult;
			}
			result = result || groupResult;
		}

		return result;
	});

	return scrollFromBottom === false ? [...results].reverse() : results;
};

export const messageSearch = (searchValue: string, chatLogs: Message[], scrollFromBottom: boolean | null): Message[] => {
	const searchKey = searchValue.split(":", 1)[0].toLowerCase();
	const searchString = searchValue.slice(searchKey.length + 1);
	if (searchKey in searchPrefixes && searchString) {
		chatLogs = searchPrefixes[searchKey as SearchPrefixKey](searchString, chatLogs);
	} else if (searchValue) {
		const searchOptions = scrollFromBottom === null ? { keys: ["channel", "displayName", "text"], threshold: 0.5 } : { keys: ["displayName", "text"], threshold: 0.5, limit: 5000 };

		chatLogs = fuzzysort
			.go(searchValue, chatLogs, searchOptions)
			.map((x) => x.obj)
			.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
	}

	return scrollFromBottom === false ? [...chatLogs].reverse() : chatLogs;
};
