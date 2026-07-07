# Task: deployment scheduling puzzle

Five microservices — A, B, C, D, E — are each deployed on a different day of one
work week (Monday through Friday, one deployment per day). Constraints:

1. A is deployed on the day immediately after C.
2. A is deployed before B.
3. D is deployed neither on Monday nor on Friday.
4. E is deployed on the day immediately after B.
5. C is not deployed on Wednesday.

## Part A

On which day is D deployed? Give the day and the full Monday→Friday order.

## Part B

Now relax constraint 1 to merely "A is deployed after C" (not necessarily
immediately). All other constraints stay. How many valid full schedules exist?

Answer format: finish your response with exactly two lines:

```
PART_A: <day>
PART_B: <number>
```
