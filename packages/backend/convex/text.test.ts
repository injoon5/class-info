import { describe, expect, test } from "vitest";
import { cleanDishName } from "./text";

describe("cleanDishName", () => {
  test("drops the feed's trailing y tag", () => {
    expect(cleanDishName("현미밥y")).toBe("현미밥");
    expect(cleanDishName("배추김치-석식y")).toBe("배추김치-석식");
    expect(cleanDishName("피자돈까스& 하이스소스y ")).toBe("피자돈까스& 하이스소스");
  });

  test("leaves untagged names and English words alone", () => {
    expect(cleanDishName("토마토바질샐러드")).toBe("토마토바질샐러드");
    expect(cleanDishName("Curry")).toBe("Curry");
    expect(cleanDishName("치킨 Jelly")).toBe("치킨 Jelly");
  });
});
