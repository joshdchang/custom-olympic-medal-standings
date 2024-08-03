import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import {
  routeLoader$,
  useLocation,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { z } from "zod";
import Img2024SummerOlympicsLogo from "~/media/2024_Summer_Olympics_logo.svg?jsx";
import { population } from "~/data/population";

const medalTableInfoSchema = z.object({
  c_AsOfDate: z.string(),
  n_EventsTotal: z.number(),
  n_EventsFinished: z.number(),
  n_EventsScheduled: z.number(),
  n_MedalsGold: z.number(),
  n_MedalsSilver: z.number(),
  n_MedalsBronze: z.number(),
  n_MedalsTotal: z.number(),
  n_SportID: z.number(),
  c_Sport: z.string().nullable(),
  c_SportShort: z.string().nullable(),
});

const medalTableNOCSchema = z.object({
  n_NOCID: z.number(),
  n_NOCGeoID: z.number(),
  c_NOC: z.string(),
  c_NOCShort: z.string(),
  n_Gold: z.number(),
  n_Silver: z.number(),
  n_Bronze: z.number(),
  n_Total: z.number(),
  n_RankGold: z.number(),
  n_RankSortGold: z.number(),
  n_RankTotal: z.number(),
  n_RankSortTotal: z.number(),
});

const medalTableSchema = z.object({
  MedalTableInfo: medalTableInfoSchema,
  MedalTableNOC: z.array(medalTableNOCSchema),
});

export const useMedals = routeLoader$(async () => {
  const response = await fetch(
    "https://api-gracenote.nbcolympics.com/svc/games_v2.svc/json/GetMedalTable_Season?competitionSetId=1&season=2024&languageCode=2",
  );
  const json = await response.json();
  return medalTableSchema.parse(json);
});

const timeSchema = z.object({
  timezone: z.string(),
  unixtime: z.number(),
});

export const useServerTime = routeLoader$(async () => {
  const response = await fetch("https://worldtimeapi.org/api/ip");
  const json = await response.json();
  const time = timeSchema.parse(json);
  return new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    minute: "numeric",
    hour: "numeric",
    timeZoneName: "short",
    timeZone: time.timezone,
  });
});

function getWeightText(weight: string) {
  const num = parseInt(weight);
  if (num === 0) {
    return "Tiebreaker";
  }
  if (num === 1) {
    return "1 point";
  }
  return `${num} points`;
}

function getIndex(
  team: z.infer<typeof medalTableNOCSchema>,
  goldWeight: string,
  silverWeight: string,
  bronzeWeight: string,
  divideByPopulation: boolean,
) {
  return (
    (team.n_Gold * (parseInt(goldWeight) + 10e-6) +
      team.n_Silver * (parseInt(silverWeight) + 10e-9) +
      team.n_Bronze * (parseInt(bronzeWeight) + 10e-12)) /
    (divideByPopulation ? population[team.c_NOCShort] : 1)
  );
}

function formatBigNumber(num: number) {
  if (num < 1e3) {
    return num.toFixed(0);
  }
  if (num < 1e6) {
    return (num / 1e3).toFixed(0) + "K";
  }
  if (num < 1e9) {
    return (num / 1e6).toFixed(0) + "M";
  }
  return (num / 1e9).toFixed(0) + "B";
}

const defaultGoldWeight = "3";
const defaultSilverWeight = "2";
const defaultBronzeWeight = "1";

export default component$(() => {
  const medals = useMedals();
  const serverTime = useServerTime();

  const loc = useLocation();

  const goldWeight = useSignal(
    loc.url.searchParams.get("gold") ?? defaultGoldWeight,
  );
  const silverWeight = useSignal(
    loc.url.searchParams.get("silver") ?? defaultSilverWeight,
  );
  const bronzeWeight = useSignal(
    loc.url.searchParams.get("bronze") ?? defaultBronzeWeight,
  );

  const divideByPopulation = useSignal(loc.url.searchParams.has("population"));

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    const goldWeightVal = track(() => goldWeight.value);
    const silverWeightVal = track(() => silverWeight.value);
    const bronzeWeightVal = track(() => bronzeWeight.value);

    const divideByPopulationVal = track(() => divideByPopulation.value);

    const url = new URL(loc.url.href);
    if (goldWeightVal === defaultGoldWeight) {
      url.searchParams.delete("gold");
    } else {
      url.searchParams.set("gold", goldWeightVal);
    }
    if (silverWeightVal === defaultSilverWeight) {
      url.searchParams.delete("silver");
    } else {
      url.searchParams.set("silver", silverWeightVal);
    }
    if (bronzeWeightVal === defaultBronzeWeight) {
      url.searchParams.delete("bronze");
    } else {
      url.searchParams.set("bronze", bronzeWeightVal);
    }
    if (divideByPopulationVal) {
      url.searchParams.set("population", "true");
    } else {
      url.searchParams.delete("population");
    }
    history.replaceState({}, "", url.href);
  });

  return (
    <div class="flex flex-col">
      <header class="flex justify-center p-6 sm:p-7 md:p-8 lg:p-9">
        <div class="flex w-full max-w-5xl flex-col items-center gap-5 py-3 sm:gap-7 md:gap-9 lg:flex-row lg:gap-16 xl:max-w-6xl xl:gap-20">
          <Img2024SummerOlympicsLogo class="h-32 w-auto sm:h-40 md:h-48 lg:h-60 xl:h-72" />
          <div class="flex w-full flex-col gap-6 sm:gap-7 md:gap-8 lg:gap-10">
            <h1 class="text-center text-lg font-medium sm:text-2xl md:text-3xl lg:text-left">
              Build your own Olympic medal standings
            </h1>
            <div class="flex w-full flex-col items-center gap-4 md:flex-row md:gap-5 lg:gap-6">
              <label class="flex w-full flex-col gap-2 rounded-lg border-2 border-amber-300 bg-amber-200 px-4 pb-4 pt-3 shadow shadow-amber-700/20">
                <div class="flex items-center justify-between gap-1 text-sm sm:text-base lg:text-lg">
                  <span class="text-amber-600">Gold</span>
                  <span class="font-medium text-black">
                    {getWeightText(goldWeight.value)}
                  </span>
                </div>
                <input
                  type="range"
                  class="
                    h-2.5
                    w-full
                    appearance-none
                    rounded-lg
                    [&::-moz-range-thumb]:h-4
                    [&::-moz-range-thumb]:w-4
                    [&::-moz-range-thumb]:cursor-pointer
                    [&::-moz-range-thumb]:appearance-none
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:bg-black
                    [&::-moz-range-thumb]:shadow
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-black
                    [&::-webkit-slider-thumb]:shadow
                  "
                  min={0}
                  max={10}
                  step={1}
                  bind:value={goldWeight}
                />
              </label>
              <label class="flex w-full flex-col gap-2 rounded-lg border-2 border-slate-300 bg-slate-200 px-4 pb-4 pt-3 shadow shadow-slate-700/20">
                <div class="flex items-center justify-between gap-1 text-sm sm:text-base lg:text-lg">
                  <span class="text-slate-500">Silver</span>
                  <span class="font-medium text-black">
                    {getWeightText(silverWeight.value)}
                  </span>
                </div>
                <input
                  type="range"
                  class="
                    h-2.5
                    w-full
                    appearance-none
                    rounded-lg
                    [&::-moz-range-thumb]:h-4
                    [&::-moz-range-thumb]:w-4
                    [&::-moz-range-thumb]:cursor-pointer
                    [&::-moz-range-thumb]:appearance-none
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:bg-black
                    [&::-moz-range-thumb]:shadow
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-black
                    [&::-webkit-slider-thumb]:shadow
                  "
                  min={0}
                  max={10}
                  step={1}
                  bind:value={silverWeight}
                />
              </label>
              <label class="flex w-full flex-col gap-2 rounded-lg border-2 border-red-300 bg-red-200 px-4 pb-4 pt-3 text-red-500 shadow shadow-red-700/20">
                <div class="flex items-center justify-between gap-1 text-sm sm:text-base lg:text-lg">
                  <span class="text-red-500">Bronze</span>
                  <span class="font-medium text-black">
                    {getWeightText(bronzeWeight.value)}
                  </span>
                </div>
                <input
                  type="range"
                  class="
                    h-2.5
                    w-full
                    appearance-none
                    rounded-lg
                    [&::-moz-range-thumb]:h-4
                    [&::-moz-range-thumb]:w-4
                    [&::-moz-range-thumb]:cursor-pointer
                    [&::-moz-range-thumb]:appearance-none
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:bg-black
                    [&::-moz-range-thumb]:shadow
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-black
                    [&::-webkit-slider-thumb]:shadow
                  "
                  min={0}
                  max={10}
                  step={1}
                  bind:value={bronzeWeight}
                />
              </label>
            </div>
            <div class="mb-2 flex flex-col gap-5 sm:flex-row sm:justify-between">
              <div class="mb-2 flex items-start justify-center gap-3 lg:justify-start">
                <label for="toggle" class="flex items-center gap-3">
                  <div class="group relative inline-block h-6 w-12">
                    <input
                      type="checkbox"
                      id="toggle"
                      class="peer sr-only"
                      bind:checked={divideByPopulation}
                    />
                    <div class="block h-6 w-12 rounded-full bg-slate-400 transition-colors group-hover:bg-slate-500 peer-checked:bg-slate-800 group-hover:peer-checked:bg-slate-900"></div>
                    <div class="dot absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow shadow-slate-800/20 transition peer-checked:translate-x-[calc(100%_+_0.5rem)] peer-checked:transform"></div>
                  </div>
                  <span
                    class={
                      "text-sm text-slate-500 transition-colors md:text-base lg:text-lg " +
                      (divideByPopulation.value
                        ? "text-slate-900"
                        : "text-slate-500")
                    }
                  >
                    Divide by population
                  </span>
                </label>
              </div>
              <div class="flex flex-col items-center gap-0.5 lg:items-end lg:gap-1">
                <p class="text-sm text-slate-800 md:text-base lg:text-lg">
                  {medals.value.MedalTableInfo.n_EventsFinished} of{" "}
                  {medals.value.MedalTableInfo.n_EventsTotal} events finished
                </p>
                <p class="text-xs text-slate-400 md:text-sm">
                  as of {serverTime.value}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main class="flex justify-center overflow-x-scroll bg-slate-100 p-6 sm:p-7 md:p-8 lg:p-9">
        <div class="flex w-full max-w-5xl flex-col xl:max-w-6xl">
          <div class="sticky top-0 grid grid-cols-[0.8fr_3.5fr_1fr_1fr_1fr_0.7fr_1.3fr] gap-2 px-1 py-2 text-xs text-slate-500 sm:px-2 sm:text-sm md:px-3 lg:px-4 lg:text-base">
            <div>
              <span class="hidden sm:block">Rank</span>
            </div>
            <div>Team</div>
            <div class="sm:hidden">G</div>
            <div class="hidden sm:block">Gold</div>
            <div class="sm:hidden">S</div>
            <div class="hidden sm:block">Silver</div>
            <div class="sm:hidden">B</div>
            <div class="hidden sm:block">Bronze</div>
            <div>All</div>
            <div class="text-right">Points</div>
          </div>
          {medals.value.MedalTableNOC.sort(
            (a, b) =>
              getIndex(
                b,
                goldWeight.value,
                silverWeight.value,
                bronzeWeight.value,
                divideByPopulation.value,
              ) -
              getIndex(
                a,
                goldWeight.value,
                silverWeight.value,
                bronzeWeight.value,
                divideByPopulation.value,
              ),
          ).map((team, i) => (
            <div
              key={team.n_NOCID}
              class="grid grid-cols-[0.8fr_3.5fr_1fr_1fr_1fr_0.8fr_1.2fr] items-center gap-2 border-t border-slate-300 px-1 py-4 text-slate-900 sm:px-2 md:px-3 lg:px-4"
            >
              <div class="text-md sm:text-xl md:text-3xl lg:text-4xl">
                {i + 1}
              </div>
              <div class="flex items-center gap-2 text-xs font-medium sm:gap-3 sm:text-base md:gap-4 md:text-lg lg:gap-5 lg:text-2xl">
                <img
                  src={`https://images.sports.gracenote.com/images/lib/basic/geo/country/flag/SVG/${team.n_NOCGeoID}.svg`}
                  class="w-6 rounded border border-slate-200 shadow-sm sm:w-9 md:w-12 lg:w-14"
                  width="60"
                  height="40"
                  alt={`${team.c_NOC} flag`}
                />
                {team.c_NOC}
              </div>
              <div class="text-xs sm:text-base md:text-lg lg:text-xl">
                <span class="flex h-6 w-6 items-center justify-center rounded-full border-2 border-amber-300 bg-amber-200 text-amber-700 shadow shadow-amber-700/20 sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-10 lg:w-10">
                  {team.n_Gold}
                </span>
              </div>
              <div class="text-xs sm:text-base md:text-lg lg:text-xl">
                <span class="flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-300 bg-slate-200 text-slate-700 shadow shadow-slate-700/20 sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-10 lg:w-10">
                  {team.n_Silver}
                </span>
              </div>
              <div class="text-xs sm:text-base md:text-lg lg:text-xl">
                <span class="flex h-6 w-6 items-center justify-center rounded-full border-2 border-red-300 bg-red-200 text-red-700 shadow shadow-red-700/20 sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-10 lg:w-10">
                  {team.n_Bronze}
                </span>
              </div>
              <div class="md:text-md text-sm sm:text-lg lg:text-2xl">
                {team.n_Total}
              </div>
              {divideByPopulation.value ? (
                <div class="flex flex-col items-end justify-end gap-0.5 text-right text-sm sm:flex-row sm:items-baseline sm:gap-1 sm:text-base md:text-xl lg:text-2xl">
                  <span class="text-xs text-slate-500 sm:text-sm md:text-base lg:text-lg">
                    1 in
                  </span>
                  {formatBigNumber(
                    population[team.c_NOCShort] /
                      (team.n_Gold * parseInt(goldWeight.value) +
                        team.n_Silver * parseInt(silverWeight.value) +
                        team.n_Bronze * parseInt(bronzeWeight.value)),
                  )}
                </div>
              ) : (
                <div class="text-right text-sm sm:text-lg md:text-2xl lg:text-3xl">
                  {team.n_Gold * parseInt(goldWeight.value) +
                    team.n_Silver * parseInt(silverWeight.value) +
                    team.n_Bronze * parseInt(bronzeWeight.value)}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
      <footer class="flex justify-center bg-slate-800 p-6 sm:p-7 md:p-8 lg:p-9">
        <div class="flex w-full max-w-5xl flex-col items-center gap-4 sm:gap-6 md:gap-8 lg:gap-10 xl:max-w-6xl">
          <div class="flex w-full items-center justify-between gap-2">
            <p class="text-center text-xs text-slate-400 sm:text-sm">
              Data from{" "}
              <a
                href="//www.nbcolympics.com/medals"
                class="text-sky-400 underline underline-offset-2 transition-colors hover:text-amber-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                NBC Olympics
              </a>
            </p>
            <p class="text-center text-xs text-slate-400 sm:text-sm">
              &copy; 2024{" "}
              <a
                href="//joshchang.co"
                class="text-sky-400 underline underline-offset-2 transition-colors hover:text-amber-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                Josh Chang
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Build your own medal standings",
  meta: [
    {
      name: "description",
      content:
        "Construct your own medal standings for the 2024 Summer Olympics in Paris by assigning different weights to gold, silver, and bronze medals.",
    },
  ],
};
