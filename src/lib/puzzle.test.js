import { load_puzzle } from '$lib/puzzle';
import { describe, expect, it } from 'vitest';

const FIRST_TEST = `
ROWS
1 a aaaaaa aa aaaaa
b aaaaaa aaaa aaaa
2 a aaa aaaaa aaaaaa
b aaaaa aa aaaaa
3 a aaaa aaa aaaaaa aaaaaa
b aaaaaa’s aaaaaa
4 a aaaaaa aaaaaa aaaaaa aaaaaa
b aaaaaa
5 a aaaaaa aaaaaa aaaaaa
b aaaaaa aaaaaa at a aaaaaa
6 a aaaaaa aaaaaa aaaaaa
b 2021 A. aaaaaa aaaaaa aaaaaa
7 a aaaaaa aaaaaa
b aaaaaa

BANDS
A a aaaaaa aaaaaa aaaaaa aaaaaa
aaaaaa: 2 wds.
b aaaaaa aaaaaa aaaaaa: 2
wds.
c aaaaaa ___ aaaaaa’s aaaaaa
aaaaaa
B a aaaaaa
b aaaaaa aaaaaa aaaaaa
c aaaaaa of a aaaaaa aaaaaa
d aaaaaa aaaaaa’s aaaaaa on aaaaaa
aaaaaa
C a To aaaaaa aaaaaa aaaaaa
aaaaaa a aaaaaa in aaaaaa’s
aaaaaa aaaaaa: 2 wds.
`

const SECOND_TEST = `
ROWS
1 a aaaaaa aaaaaa aaaaaa as
the aaaaaa aaaaaa aaaaaa
b aaaaaa aaaaaa, as aaaaaa’s aaaaaa
2 a The aaaaaa’s aaaaaa aaaaaa
by aaaaaa
b aaaaaa 4 a, by aaaaaa aaaaaa: 5
wds.
3 a “We got aaaaaa aaaaaa! We aaaaaa
aaaaaa and ___!” (The
    aaaaaa aaaaaa aaaaaa)
b aaaaaa in aaaaaa of
aaaaaa aaaaaa
4 a See 2 b
b 2000s aaaaaa aaaaaa aaaaaa a
aaaaaa aaaaaa of aaaaaa in
aaaaaa (not aaaaaa)
5 a aaaaaa of aaaaaa who was
aaaaaa’s aaaaaa of the aaaaaa
in 1981
b aaaaaa’s aaaaaa aaaaaa aaaaaa
6 a aaaaaa aaaaaa
aaaaaa
b aaaaaa aaaaaa of aaaaaa
7 a aaaaaa aaaaaa aaaaaa aaaaaa to
aaaaaa the aaaaaa
b aaaaaa aaaaaa
8 a aaaaaa a aaaaaa aaaaaa by a
aaaaaa
b aaaaaa! at the aaaaaa aaaaaa
aaaaaa aaaaaa
9 a aaaaaa of The aaaaaa aaaaaa
b aaaaaa aaaaaa to aaaaaa
aaaaaa any aaaaaa aaaaaa
aaaaaa: 2 wds.
10 a aaaaaa aaaaaa aaaaaa
with aaaaaa-aaaaaa aaaaaa
b aaaaaa aaaaaa aaaaaa, in a way
11 a aaaaaa aaaaaa who
aaaaaa aaaaaa aaaaaa’s
aaaaaa aaaaaa
b aaaaaa aaaaaa aaaaaa for whom
an era was named: 2 wds.
12 a aaaaaa aaaaaa aaaaaa, in
aaaaaa
b aaaaaa aaaaaa and aaaaaa
aaaaaa aaaaaa for aaaaaa
13 a aaaaaa a aaaaaa for
b aaaaaa aaaaaa in aaaaaa,
aaaaaa, and aaaaaa aaaaaa
14 a aaaaaa a aaaaaa and aaaaaa it
aaaaaa
b aaaaaa aaaaaa aaaaaa aaaaaa by
aaaaaa and aaaaaa aaaaaa aaaaaa
aaaaaa' aaaaaa, aaaaaa
aaaaaa, and a aaaaaa
and aaaaaa aaaaaa: 2 wds.
15 a The aaaaaa aaaaaa aaaaaa
b aaaaaa aaaaaa: 2 wds.

BANDS
A a aaaaaa for an aaaaaa aaaaaa
aaaaaa’s aaaaaa aaaaaa aaaaaa
if it aaaaaa in “-te”
b aaaaaa aaaaaa aaaaaa: 2 wds.
c aaaaaa aaaaaa: 2 wds.
d aaaaaa aaaaaa who aaaaaa
the aaaaaa aaaaaa
aaaaaa aaaaaa aaaaaa aaaaaa
e aaaaaa aaaaaa’s aaaaaa in
aaaaaa 2020 aaaaaa aaaaaa
aaaaaa: 2 wds.
f aaaaaa aaaaaa aaaaaa’s aaaaaa
g aaaaaa aaaaaa
h aaaaaa of aaaaaa aaaaaa
i aaaaaa’s aaaaaa
j aaaaaa aaaaaa aaaaaa, on
aaaaaa aaaaaa
B a aaaaaa aaaaaa aaaaaa
who was aaaaaa aaaaaa
in aaaaaa aaaaaa: 2 wds.
b aaaaaa of aaaaaa aaaaaa
c aaaaaa’s aaaaaa: aaaaaa.
d aaaaaa with aaaaaa
e aaaaaa that aaaaaa to aaaaaa
its aaaaaa aaaaaa for a aaaaaa
f aaaaaa aaaaaa
g aaaaaa “The,” aaaaaa aaaaaa
with a aaaaaa aaaaaa
aaaaaa it
h aaaaaa-aaaaaa aaaaaa
aaaaaa aaaaaa aaaaaa: 2 wds.

C a aaaaaa aaaaaa be made
of ___ aaaaaa” (aaaaaa aaaaaa)
b aaaaaa aaaaaa: 3 wds.
c aaaaaa aaaaaa who
aaaaaa the aaaaaa
aaaaaa aaaaaa
d aaaaaa aaaaaa in
“aaaaaa aaaaaa-aaaaaa
aaaaaa
e aaaaaa who was aaaaaa
aaaaaa in aaaaaa
in aaaaaa
f "... ___ aaaaaa, aaaaaa,
aaaaaa, o-o-o-oh": 2 wds.
D a aaaaaa aaaaaa aaaaaa aaaaaa: 2
wds.
b aaaaaa aaaaaa aaaaaa
aaaaaa
c aaaaaa aaaaaa: 2 wds.
d aaaaaa aaaaaa aaaaaa aaaaaa
e aaaaaa aaaaaa
f aaaaaa ___” (aaaaaa
    aaaaaa aaaaaa}
E a aaaaaa aaaaaa
b aaaaaa, e.g.
c aaaaaa aaaaaa: 2 wds.
d “___ aaaaaa
F a aaaaaa aaaaaa’s aaaaaa
aaaaaa: 3 wds.
b aaaaaa aaaaaa out to aaaaaa
G a aaaaaa aaaaaa, in
aaaaaa: 2 wds.`

describe('puzzle input test', () => {
    it('puzzle 37 loads correctly', () => {

        const puzzle = load_puzzle(FIRST_TEST);
        expect(puzzle).not.toBe(null);
        // expect three bands and 7 rows
        expect(puzzle.bands.length).toBe(3);
        expect(puzzle.rows.length).toBe(7);
    });

    it('puzzle 66 loads correctly', () => {

        const puzzle = load_puzzle(SECOND_TEST);
        expect(puzzle).not.toBe(null);
        // expect three bands and 7 rows
        expect(puzzle.bands.length).toBe(7);
        expect(puzzle.rows.length).toBe(15);
    });
});
