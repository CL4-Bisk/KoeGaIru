export function reorderBlockIds(
  blockIds: string[],
  draggedBlockId: string,
  targetBlockId: string,
) {
  const fromIndex = blockIds.indexOf(draggedBlockId);
  const toIndex = blockIds.indexOf(targetBlockId);

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return blockIds;
  }

  const reorderedBlockIds = [...blockIds];
  const [draggedId] = reorderedBlockIds.splice(fromIndex, 1);

  if (!draggedId) {
    return blockIds;
  }

  reorderedBlockIds.splice(toIndex, 0, draggedId);

  return reorderedBlockIds;
}
