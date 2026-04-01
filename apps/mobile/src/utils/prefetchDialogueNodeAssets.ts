import { Image } from "expo-image";

function isHttpUrl(u: string | undefined | null): u is string {
  return typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://"));
}

/** Dialogue script shape on world_map_nodes (matches InteractionModal resolution). */
function dialogueScriptFromNode(node: any): { image_url?: string }[] {
  if (!node) return [];
  if (node.interaction_data?.dialogue_script) return node.interaction_data.dialogue_script;
  if (node.interaction_data?.script) return node.interaction_data.script;
  if (node.metadata?.dialogue) return node.metadata.dialogue;
  return [];
}

function collectImageUrlsFromNode(node: any): string[] {
  const urls = new Set<string>();
  if (!node) return [];

  const bg =
    node.interaction_data?.scene?.scene_background_url ||
    node.metadata?.visuals?.bg_url ||
    node.modal_image_url ||
    node.background_url;
  if (isHttpUrl(bg)) urls.add(bg);

  const sprite =
    node.interaction_data?.scene?.scene_npc_sprite_url ||
    node.metadata?.visuals?.npc_sprite_url ||
    node.metadata?.visuals?.monster_url ||
    node.icon_url;
  if (isHttpUrl(sprite)) urls.add(sprite);

  for (const line of dialogueScriptFromNode(node)) {
    if (isHttpUrl(line?.image_url)) urls.add(line.image_url);
  }

  return [...urls];
}

/** Warm expo-image disk/memory cache for NPC dialogue visuals when nodes are nearby (no audio — voice stays lazy in DialogueScene). */
export function prefetchDialogueNodeAssets(nodes: any[] | undefined): void {
  if (!nodes?.length) return;
  const seen = new Set<string>();
  for (const n of nodes) {
    for (const url of collectImageUrlsFromNode(n)) {
      if (seen.has(url)) continue;
      seen.add(url);
      void Image.prefetch(url).catch(() => {});
    }
  }
}
