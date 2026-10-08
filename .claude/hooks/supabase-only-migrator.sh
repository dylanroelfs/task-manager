#!/bin/bash
# Laat Supabase MCP-tools alleen toe voor de agent "migrator".
# Claude Code geeft agent_type mee als een subagent de tool aanroept,
# of als de sessie gestart is met `claude --agent migrator`.
# Exit-code 2 blokkeert de tool; stderr gaat terug naar de agent.

agent_type=$(jq -r '.agent_type // empty')

if [ "$agent_type" = "migrator" ]; then
  exit 0
fi

echo "Geblokkeerd: Supabase-tools zijn alleen beschikbaar voor de migrator-agent. Vraag de gebruiker om @agent-migrator te gebruiken of 'claude --agent migrator' te starten." >&2
exit 2
