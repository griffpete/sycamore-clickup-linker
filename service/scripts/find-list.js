import { config } from "../src/config.js";
import { getFolderlessLists, getFolders, getSpaces } from "../src/clickup.js";

const searchText = (process.argv[2] ?? "").toLowerCase();

async function getAllLists() {
  const lists = [];

  for (const space of await getSpaces(config.clickupWorkspaceId)) {
    for (const folder of await getFolders(space.id)) {
      for (const list of folder.lists ?? []) {
        lists.push({ id: list.id, path: `${space.name} > ${folder.name} > ${list.name}` });
      }
    }

    for (const list of await getFolderlessLists(space.id)) {
      lists.push({ id: list.id, path: `${space.name} > ${list.name}` });
    }
  }

  return lists;
}

async function main() {
  const lists = await getAllLists();
  const matches = lists.filter((list) => list.path.toLowerCase().includes(searchText));

  if (matches.length === 0) {
    console.log(`No lists matched "${searchText}".`);
    console.log("Open the list in ClickUp and copy the number after /li/ in the address bar instead.");
    return;
  }

  for (const list of matches) {
    console.log(`${list.id}  ${list.path}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
