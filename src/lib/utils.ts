import { FileCollection } from "@/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type TreeItem = string | [string, ...TreeItem[]];

/**
 * Convert a record of files to a tree structure.
 * @param files - The record of file paths to content
 * @returns Tree structure for TreeView component
 * @example
 * Input: { "src/Button.tsx": "...", "README.md": "..." }
 * Output: [["src", "Button.tsx"], "README.md"]
 */
export const convertFilesToTree = (files: FileCollection): TreeItem[] => {
  const sortedPaths = Object.keys(files);
  if (sortedPaths.length === 0) return [];

  interface TreeNode {
    [key: string]: TreeNode | null;
  }

  const tree: TreeNode = {};
  sortedPaths.sort();

  for (const path of sortedPaths) {
    const parts = path.split("/");
    let current = tree;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    const fileName = parts[parts.length - 1];
    // Don't overwrite a directory node with a file marker
    if (current[fileName] === undefined) {
      current[fileName] = null;
    }
  }

  const convertNode = (node: TreeNode): TreeItem[] => {
    const children: TreeItem[] = [];

    for (const [key, value] of Object.entries(node)) {
      if (value === null) {
        children.push(key);
      } else {
        children.push([key, ...convertNode(value)]);
      }
    }

    return children;
  };

  return convertNode(tree);
};
