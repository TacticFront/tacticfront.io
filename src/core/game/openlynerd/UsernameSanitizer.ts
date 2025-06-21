// src/core/game/openlynerd/UsernameSanitizer.ts

// src/core/game/UsernameSanitizer.ts

// src/core/game/Filter.ts

import { Filter } from "bad-words";

export class UsernameSanitizer {
  static filter = new Filter();

  static {
    // You can add as many as you want; these are just examples
    this.filter.addWords(
      "hitler",
      "ku klux",
      "klan",
      "hitler", // reserved/abuse-prone names
      // Add more custom banned words or slur variants below (don't include actual slurs in code)
      // "nwordvariant", "anotherbadword", ...
    );
  }

  static sanitize(username: string): string {
    if (!username) return this.anonName();

    const trimmed = username.trim();

    // Only allow basic characters
    if (!/^[a-zA-Z0-9 _]+$/.test(trimmed)) {
      return this.anonName();
    }

    // Profanity check
    if (this.filter.isProfane(trimmed)) {
      return this.anonName();
    }

    return trimmed;
  }

  // New: Checks for profane/disallowed usernames
  static isProfane(username: string): boolean {
    if (!username) return true;

    const trimmed = username.trim();

    if (!/^[a-zA-Z0-9 _]+$/.test(trimmed)) {
      return true;
    }

    if (this.filter.isProfane(trimmed)) {
      return true;
    }

    return false;
  }

  private static anonName(): string {
    return `TOSViolator${Math.floor(1000 + Math.random() * 9000)}`;
  }
}
