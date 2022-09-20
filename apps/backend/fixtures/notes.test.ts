import { NOTE_1 } from "./notes"

jest.mock('ulid', () => ({
  ulid: () => 'n1'
}))

test('expect first note to have id of n1', () => {
  expect(NOTE_1.id).toBe('n1')
})
