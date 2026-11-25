// ST-derived values: Basic Lift and thrust/swing damage.

// Thrust / swing by ST (Basic Set damage table), 1..40.
const DMG = [null,
    ['1d-6', '1d-5'], ['1d-6', '1d-5'], ['1d-5', '1d-4'], ['1d-5', '1d-4'], ['1d-4', '1d-3'],
    ['1d-4', '1d-3'], ['1d-3', '1d-2'], ['1d-3', '1d-2'], ['1d-2', '1d-1'], ['1d-2', '1d'],
    ['1d-1', '1d+1'], ['1d-1', '1d+2'], ['1d', '2d-1'], ['1d', '2d'], ['1d+1', '2d+1'],
    ['1d+1', '2d+2'], ['1d+2', '3d-1'], ['1d+2', '3d'], ['2d-1', '3d+1'], ['2d-1', '3d+2'],
    ['2d', '4d-1'], ['2d', '4d'], ['2d+1', '4d+1'], ['2d+1', '4d+2'], ['2d+2', '5d-1'],
    ['2d+2', '5d'], ['3d-1', '5d+1'], ['3d-1', '5d+1'], ['3d', '5d+2'], ['3d', '5d+2'],
    ['3d+1', '6d-1'], ['3d+1', '6d-1'], ['3d+2', '6d'], ['3d+2', '6d'], ['4d-1', '6d+1'],
    ['4d-1', '6d+1'], ['4d', '6d+2'], ['4d', '6d+2'], ['4d+1', '7d-1'], ['4d+1', '7d-1'],
];

export function basicLift(st) {
    const bl = (st * st) / 5;
    return bl >= 10 ? Math.round(bl) : Math.round(bl * 10) / 10;
}

export function damage(st) {
    const s = Math.max(1, Math.round(st));
    if (s <= 40) return { thrust: DMG[s][0], swing: DMG[s][1] };
    // Beyond 40: +1d per 10 ST (approximation of the table's continuation).
    const extra = Math.floor((s - 40) / 10);
    return { thrust: `${5 + extra}d`, swing: `${7 + extra}d` };
}
