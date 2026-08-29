export interface SlashCommand {
  id: string;
  aliases: string[];
  description: string;
  execute: () => Promise<void>;
}

export interface SlashCommandSuggestion {
  command: SlashCommand;
  matchedAlias: string;
  prefix?: string;
}

class SlashCommandService {
  private commands: Map<string, SlashCommand> = new Map();

  registerCommand(command: SlashCommand) {
    this.commands.set(command.id, command);
  }

  getCommands(): SlashCommand[] {
    return Array.from(this.commands.values());
  }

  getCommand(id: string): SlashCommand | undefined {
    return this.commands.get(id);
  }

  getSuggestions(input: string): SlashCommandSuggestion[] {
    if (!input.startsWith('/') && !input.startsWith('@')) return [];

    const prefix = input.charAt(0);
    const query = input.slice(1).toLowerCase();

    // Special case: if it's exactly "/help" or "/commands" or "@help", show all commands
    if (query === 'help' || query === 'commands' || query === '') {
      return this.getCommands()
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(cmd => ({
          command: cmd,
          matchedAlias: cmd.aliases[0],
          prefix,
        }));
    }

    const suggestions: SlashCommandSuggestion[] = [];

    for (const command of this.commands.values()) {
      for (const alias of command.aliases) {
        if (alias.toLowerCase().startsWith(query)) {
          suggestions.push({ command, matchedAlias: alias, prefix });
          break; // Only add each command once
        }
      }
    }

    return suggestions.sort((a, b) => {
      // Exact matches first
      const aExact = a.matchedAlias.toLowerCase() === query;
      const bExact = b.matchedAlias.toLowerCase() === query;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // Then by alias length (shorter first)
      return a.matchedAlias.length - b.matchedAlias.length;
    });
  }

  isValidCommand(input: string): boolean {
    if (!input.startsWith('/') && !input.startsWith('@')) return false;
    const query = input.slice(1).toLowerCase();

    for (const command of this.commands.values()) {
      if (command.aliases.some(alias => alias.toLowerCase() === query)) {
        return true;
      }
    }
    return false;
  }

  async executeCommand(input: string): Promise<boolean> {
    if (!input.startsWith('/') && !input.startsWith('@')) return false;
    const query = input.slice(1).toLowerCase();

    for (const command of this.commands.values()) {
      for (const alias of command.aliases) {
        if (alias.toLowerCase() === query) {
          await command.execute();
          return true;
        }
      }
    }
    return false;
  }
}

export const slashCommandService = new SlashCommandService();
