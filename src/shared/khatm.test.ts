import { describe, expect, it } from "vitest";
import { compareKazakh, planSeats } from "./khatm.ts";
import { randomToken } from "./random.ts";

describe("planSeats (BR-2)", () => {
  it("gives name i juz i and leaves the rest «Бос»", () => {
    const plan = planSeats(["Айгүл А.", "Нұрлан С."]);
    expect(plan).toHaveLength(30);
    expect(plan[0]).toEqual({ juz: 1, name: "Айгүл А." });
    expect(plan[1]).toEqual({ juz: 2, name: "Нұрлан С." });
    expect(plan[2]).toEqual({ juz: 3, name: null });
    expect(plan[29]).toEqual({ juz: 30, name: null });
  });

  it("fills all 30 juz when there are 30 names", () => {
    const names = Array.from({ length: 30 }, (_, i) => `Адам ${String(i + 1)}`);
    expect(planSeats(names).every((seat, i) => seat.name === names[i])).toBe(true);
  });

  it("refuses more than 30 names", () => {
    expect(() => planSeats(Array.from({ length: 31 }, () => "А"))).toThrow(RangeError);
  });
});

describe("compareKazakh", () => {
  it("sorts in Kazakh alphabet order, as in mockup 1", () => {
    const expected = [
      "Айгүл А.",
      "Ақмарал С.",
      "Асқар Т.",
      "Әйгерім Ж.",
      "Әсел Н.",
      "Бауыржан К.",
      "Бекзат Ө.",
      "Гүлмира Т.",
      "Гүлнар Б.",
      "Ғалым Р.",
      "Дәурен Е.",
      "Динара Ж.",
      "Ержан Б.",
      "Ерлан М.",
      "Жанар О.",
      "Қайрат Н.",
      "Құралай Д.",
      "Ләззат И.",
      "Мадина Е.",
      "Мейрамгүл Д.",
      "Мұрат Қ.",
      "Нұргүл С.",
      "Нұрлан С.",
      "Роза М.",
      "Сәуле Қ.",
      "Серік А.",
      "Талғат Ж.",
      "Шынар Ә.",
    ];
    expect([...expected].reverse().sort(compareKazakh)).toEqual(expected);
  });

  it("puts each Kazakh letter after its base letter, and І after Ы", () => {
    const expected = [
      "Арман",
      "Әли",
      "Гауһар",
      "Ғани",
      "Иса",
      "Йошкар",
      "Кәмила",
      "Қанат",
      "Ната",
      "Ңа",
      "Оспан",
      "Өмір",
      "Уәли",
      "Ұлан",
      "Үміт",
      "Хан",
      "Һәкім",
      "Ыбырай",
      "Іңкәр",
    ];
    expect([...expected].reverse().sort(compareKazakh)).toEqual(expected);
  });

  it("puts a name first when it is the start of a longer one", () => {
    expect(["Айгүлім", "Айгүл А.", "Айгүл"].sort(compareKazakh)).toEqual([
      "Айгүл",
      "Айгүл А.",
      "Айгүлім",
    ]);
  });

  it("ignores upper and lower case", () => {
    expect(["ӘСЕЛ", "арман", "Бақыт"].sort(compareKazakh)).toEqual(["арман", "ӘСЕЛ", "Бақыт"]);
  });
});

describe("randomToken", () => {
  it("makes a 128-bit base64url token (22 characters, URL-safe)", () => {
    expect(randomToken(16)).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it("is different every time", () => {
    expect(randomToken(16)).not.toBe(randomToken(16));
  });
});
