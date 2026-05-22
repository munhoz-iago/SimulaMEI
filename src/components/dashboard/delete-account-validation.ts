export const DELETE_CONFIRMATION = 'EXCLUIR'

export function isDeleteInputValid(input: string): boolean {
  return input === DELETE_CONFIRMATION
}
