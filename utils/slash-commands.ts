export interface SlashCommand {
  id: string;
  aliases: string[];
  description: string;
  execute: () => Promise<void>;
  prefix?: '@' | '/';
}

export interface SlashCommandSuggestion {
  command: SlashCommand;
  matchedAlias: string;
  prefix?: string;
}

class SlashCommandService {
  private commands: Map<string, SlashCommand> = new Map();

  registerCommand(command: SlashCommand) {
    if (!command.prefix) {
      command.prefix = command.id === 'chase' ? '@' : '/';
    }
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

    const typedPrefix = input.charAt(0);
    const query = input.slice(1).toLowerCase();

    // If user types '@': ONLY show '@' commands (e.g. @chase)
    if (typedPrefix === '@') {
      const atCommands = this.getCommands().filter(c => c.prefix === '@' || c.id === 'chase');

      if (query === '' || query === 'help' || query === 'commands') {
        return atCommands.map(cmd => ({
          command: cmd,
          matchedAlias: cmd.aliases[0],
          prefix: '@',
        }));
      }

      const suggestions: SlashCommandSuggestion[] = [];
      for (const command of atCommands) {
        for (const alias of command.aliases) {
          if (alias.toLowerCase().startsWith(query)) {
            suggestions.push({ command, matchedAlias: alias, prefix: '@' });
            break;
          }
        }
      }
      return suggestions;
    }

    // If user types '/': show standard slash commands
    const slashCommands = this.getCommands().filter(c => c.prefix !== '@' && c.id !== 'chase');

    if (query === 'help' || query === 'commands' || query === '') {
      return slashCommands
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(cmd => ({
          command: cmd,
          matchedAlias: cmd.aliases[0],
          prefix: '/',
        }));
    }

    const suggestions: SlashCommandSuggestion[] = [];

    // Check slash commands for matching query
    for (const command of slashCommands) {
      for (const alias of command.aliases) {
        if (alias.toLowerCase().startsWith(query)) {
          suggestions.push({
            command,
            matchedAlias: alias,
            prefix: '/',
          });
          break;
        }
      }
    }

    return suggestions.sort((a, b) => {
      const aExact = a.matchedAlias.toLowerCase() === query;
      const bExact = b.matchedAlias.toLowerCase() === query;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

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
      if (command.aliases.some(alias => alias.toLowerCase() === query)) {
        await command.execute();
        return true;
      }
    }
    return false;
  }
}

export const slashCommandService = new SlashCommandService();
