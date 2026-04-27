import { test, expect } from "bun:test"
import { Schema } from "effect"
import { Question } from "../../src/question"

const Option = Schema.decodeUnknownSync(Question.Option)
const Info = Schema.decodeUnknownSync(Question.Info)
const Prompt = Schema.decodeUnknownSync(Question.Prompt)
const Request = Schema.decodeUnknownSync(Question.Request)

test("Option.label rejects > 50 chars", () => {
  expect(() => Option({ label: "x".repeat(51), description: "ok" })).toThrow()
})

test("Option.label accepts exactly 50 chars", () => {
  expect(() => Option({ label: "x".repeat(50), description: "ok" })).not.toThrow()
})

test("Option.description rejects > 50 chars", () => {
  expect(() => Option({ label: "ok", description: "x".repeat(51) })).toThrow()
})

test("Option.description accepts exactly 50 chars", () => {
  expect(() => Option({ label: "ok", description: "x".repeat(50) })).not.toThrow()
})

const validOption = { label: "ok", description: "ok" }
const validInfo = {
  question: "ok",
  header: "ok",
  options: [validOption, validOption],
  multiple: false,
  custom: true,
}

test("Info.question rejects > 200 chars", () => {
  expect(() => Info({ ...validInfo, question: "x".repeat(201) })).toThrow()
})

test("Info.question accepts exactly 200 chars", () => {
  expect(() => Info({ ...validInfo, question: "x".repeat(200) })).not.toThrow()
})

test("Info.header rejects > 30 chars", () => {
  expect(() => Info({ ...validInfo, header: "x".repeat(31) })).toThrow()
})

test("Info.header accepts exactly 30 chars", () => {
  expect(() => Info({ ...validInfo, header: "x".repeat(30) })).not.toThrow()
})

test("Option.label rejects empty / whitespace-only", () => {
  expect(() => Option({ label: "", description: "ok" })).toThrow()
  expect(() => Option({ label: "   ", description: "ok" })).toThrow()
})

test("Info.question rejects empty / whitespace-only", () => {
  expect(() => Info({ ...validInfo, question: "" })).toThrow()
  expect(() => Info({ ...validInfo, question: "   " })).toThrow()
})

test("Info.options rejects fewer than 2", () => {
  expect(() => Info({ ...validInfo, options: [validOption] })).toThrow()
})

test("Info.options rejects more than 4", () => {
  expect(() => Info({ ...validInfo, options: Array(5).fill(validOption) })).toThrow()
})

test("Info.options accepts exactly 2", () => {
  expect(() => Info({ ...validInfo, options: [validOption, validOption] })).not.toThrow()
})

test("Info.options accepts exactly 4", () => {
  expect(() => Info({ ...validInfo, options: Array(4).fill(validOption) })).not.toThrow()
})

test("Info rejects custom: false with empty options (caught by options.min(2))", () => {
  // options.min(2) catches empty arrays before any custom-vs-options refinement could fire,
  // so the dock is guaranteed to receive at least 2 selectable options regardless of custom.
  expect(() => Info({ ...validInfo, custom: false, options: [] })).toThrow()
})

test("Prompt accepts custom flag (LLM can set it for exhaustive options)", () => {
  // Prompt mirrors Info — `custom` is exposed so the tool description's
  // "Set false only when the options are exhaustive" instruction is reachable.
  const withCustom = {
    question: "ok",
    header: "ok",
    options: [validOption, validOption],
    multiple: false,
    custom: false,
  }
  expect(() => Prompt(withCustom)).not.toThrow()
  // And without custom (defaults to true at the dock layer).
  const withoutCustom = {
    question: "ok",
    header: "ok",
    options: [validOption, validOption],
    multiple: false,
  }
  expect(() => Prompt(withoutCustom)).not.toThrow()
})

test("Info.question rejection message includes the actionable hint", () => {
  // Each .max() carries a hint so the LLM can repair on rejection. Guard a representative
  // length-error and count-error so a future refactor can't silently drop the hint contract.
  try {
    Info({ ...validInfo, question: "x".repeat(201) })
    throw new Error("should have thrown")
  } catch (e: any) {
    const msg = String(e?.message ?? e)
    expect(msg).toContain("Question is too long")
    expect(msg).toContain("max 200 chars")
  }
})

test("Info.options rejection message includes the actionable hint", () => {
  try {
    Info({ ...validInfo, options: Array(5).fill(validOption) })
    throw new Error("should have thrown")
  } catch (e: any) {
    const msg = String(e?.message ?? e)
    expect(msg).toContain("at most 4 options")
  }
})

test("Request.questions rejects more than 4", () => {
  expect(() =>
    Request({
      id: "que_test",
      sessionID: "ses_test",
      questions: Array(5).fill(validInfo),
    }),
  ).toThrow()
})

test("Request.questions rejects empty array", () => {
  expect(() =>
    Request({
      id: "que_test",
      sessionID: "ses_test",
      questions: [],
    }),
  ).toThrow()
})

test("Request.questions accepts 1 to 4", () => {
  for (const n of [1, 2, 3, 4]) {
    expect(() =>
      Request({
        id: "que_test",
        sessionID: "ses_test",
        questions: Array(n).fill(validInfo),
      }),
    ).not.toThrow()
  }
})
