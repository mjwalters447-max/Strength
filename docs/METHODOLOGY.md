# Experimental grading, version 0.1

Identifier: `strength-0.1-experimental`. The executable definition is `METHOD` in `lib/model.mjs`; the interface displays that same definition. These draft weights belong only to the viewer. They have not been adopted as investment rules.

Buy strength measures evidence supporting new exposure at the assessed price and horizon. Sell strength measures evidence supporting reducing a generic long exposure. They are independent, do not sum to 100, and are not probabilities, suitability judgments, short-selling signals, or execution instructions.

Each group has an authored level: 0 no supporting evidence, 1 weak, 2 mixed, 3 strong, 4 very strong. Every level needs a reason. The result is `round(sum(weight × level / 4))`. Round only once at the end.

| Evidence group | Buy weight | Sell weight |
| --- | ---: | ---: |
| Thesis / business support or deterioration | 25 | 35 |
| Price-volume structure or damage | 25 | 25 |
| Valuation opportunity or pressure | 20 | 15 |
| Catalyst support or event downside | 15 | 15 |
| Entry liquidity or liquidity stress | 15 | 10 |

The factor definitions differ by direction. Analysts must explain them separately. Multiple correlated technical indicators belong in the same structure group, not separate votes. Soft rates or breadth concerns are contextual evidence, not an automatic veto. Do not award a favorable thesis level from a chart alone.

Descriptive bands are 0–24 little supporting evidence, 25–49 limited, 50–74 mixed to supportive, 75–100 strong. They are display descriptions, not trading thresholds. A one-point change is not a meaningful difference by default.

## Missing, stale and contradictory evidence

- `null` means missing; zero means an assessed absence of supporting evidence.
- All five factors are required for a score. Missing factors do not redistribute weights or turn into neutral values.
- Coverage is the fraction of groups assessed. It is not confidence or probability.
- Research expires at `validUntil`, including the exact boundary. Scores disappear; dated explanations remain inspectable. Demo dates are fixed and always labeled fictional.
- `THESIS_FAILURE`, `ACUTE_LIQUIDITY_STRESS`, and `UNUSABLE_MARKET_DATA` block the buy grade. They do not invent or increase a sell grade.
- An INVALIDATED thesis requires the thesis-failure veto for every horizon. Invalid relationships fail validation.
- An unavailable 5-, 10-, or 20-session assessment stays unavailable. No grade is extrapolated from another horizon.
- The first version does not draw historical grade lines. Historical grades require preserved original snapshots, not applying today's view to old prices.

## Evidence before adoption

Prospectively preserve issue time, available evidence, rubric version, declared horizon and contrary cases. Evaluate every eligible case, including missing and failed research, against matched feasible alternatives. Price-chart returns alone do not establish grading skill. Do not tune weights after seeing outcomes or change existing investment policy based on these experimental scores.
