/// <reference types="vite/client" />
import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

test("getTwoWeeks lays out Mon–Fri of both weeks with the feed's dish tags removed", async () => {
  const t = convexTest(schema, modules);
  await t.run((ctx) =>
    ctx.db.insert("meals", {
      date: "20260825",
      mealType: "석식",
      dishes: ["현미밥y", "", "Curry"],
      originInfo: "",
      calories: "700 Kcal",
      nutrients: null,
      schoolCode: "7010208",
      schoolName: "학교",
      loadedAt: "20260820",
      editedAt: 0,
    })
  );
  const { thisWeek, nextWeek, availableMealTypes } = await t.query(api.meals.getTwoWeeks, {
    weekStart: "20260817",
  });
  expect(thisWeek.days.map((d) => d.date)).toEqual(["20260817", "20260818", "20260819", "20260820", "20260821"]);
  expect(nextWeek.startdate).toBe("20260824");
  expect(nextWeek.days[1]!.dinner?.dishes).toEqual(["현미밥", "Curry"]);
  expect(nextWeek.days[1]!.lunch).toBeNull();
  expect(availableMealTypes).toEqual(["석식"]);
});
