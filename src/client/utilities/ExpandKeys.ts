// src/client/utilities/ExpandKeys.ts

import { GameUpdateType } from "../../core/game/GameUpdates";

const playerKeyMap = {
  t: "type",
  c: "clientID",
  f: "flag",
  n: "name",
  d: "displayName",
  i: "id",
  tm: "team",
  s: "smallID",
  pt: "playerType",
  a: "isAlive",
  dc: "isDisconnected",
  to: "tilesOwned",
  g: "gold",
  ga: "goldAdded",
  pa: "popAdded",
  mp: "maxPopulation",
  p: "population",
  w: "workers",
  tr: "troops",
  of: "offensiveTroops",
  ttr: "targetTroopRatio",
  rtr: "reserveTroopRatio",
  al: "allies",
  em: "embargoes",
  it: "isTraitor",
  tg: "targets",
  oe: "outgoingEmojis",
  oa: "outgoingAttacks",
  ia: "incomingAttacks",
  oar: "outgoingAllianceRequests",
  hs: "hasSpawned",
  br: "betrayals",
  ut: "unlockedTechnologies",
  tl: "techLevel",
};

const keyMaps = {
  [GameUpdateType.Player]: playerKeyMap,
  // Add others here as you introduce them, e.g. Unit, Tile, etc.
};

function expandKeys(obj, map) {
  const res = {};
  for (const k in obj) res[map[k] || k] = obj[k];
  return res;
}

export default expandKeys;
export { keyMaps, playerKeyMap };
