/** Oltre questo numero di tappe intermedie si passa dall'esatto all'euristico. */
export const EXACT_LIMIT = 12;

/**
 * Ordina le tappe `middle` fra `start` e `end` minimizzando la distanza totale.
 *
 * Fino a {@link EXACT_LIMIT} tappe usa Held-Karp e il risultato e' ottimo.
 * Oltre, parte dall'ordine ricevuto (che a monte e' la "serpentina" delle
 * corsie, quindi gia' sensata) e la raffina con 2-opt e Or-opt.
 */
export function solveOrder(dist: number[][], start: number, end: number, middle: number[]): number[] {
  if (middle.length === 0) return [start, end];
  if (middle.length === 1) return [start, middle[0], end];

  const inner =
    middle.length <= EXACT_LIMIT ? heldKarp(dist, start, end, middle) : refine(dist, start, end, [...middle]);

  return [start, ...inner, end];
}

/** Programmazione dinamica su sottoinsiemi: O(2^n · n²). */
function heldKarp(dist: number[][], start: number, end: number, middle: number[]): number[] {
  const n = middle.length;
  const states = 1 << n;
  const cost = new Float64Array(states * n).fill(Infinity);
  const parent = new Int32Array(states * n).fill(-1);

  for (let i = 0; i < n; i++) {
    cost[(1 << i) * n + i] = dist[start][middle[i]];
  }

  for (let mask = 1; mask < states; mask++) {
    for (let last = 0; last < n; last++) {
      if ((mask & (1 << last)) === 0) continue;

      const current = cost[mask * n + last];
      if (current === Infinity) continue;

      for (let next = 0; next < n; next++) {
        if (mask & (1 << next)) continue;

        const nextMask = mask | (1 << next);
        const candidate = current + dist[middle[last]][middle[next]];
        if (candidate < cost[nextMask * n + next]) {
          cost[nextMask * n + next] = candidate;
          parent[nextMask * n + next] = last;
        }
      }
    }
  }

  const full = states - 1;
  let bestLast = 0;
  let best = Infinity;
  for (let last = 0; last < n; last++) {
    const candidate = cost[full * n + last] + dist[middle[last]][end];
    if (candidate < best) {
      best = candidate;
      bestLast = last;
    }
  }

  const order: number[] = [];
  let mask = full;
  let last = bestLast;
  while (last !== -1) {
    order.push(middle[last]);
    const previous = parent[mask * n + last];
    mask ^= 1 << last;
    last = previous;
  }

  return order.reverse();
}

/** 2-opt + Or-opt fino a convergenza. Estremi fissi. */
function refine(dist: number[][], start: number, end: number, middle: number[]): number[] {
  const tour = [start, ...middle, end];
  const at = (i: number, j: number) => dist[tour[i]][tour[j]];

  let improved = true;
  while (improved) {
    improved = false;

    // 2-opt: inverte un segmento se accorcia il giro.
    for (let i = 1; i < tour.length - 2; i++) {
      for (let j = i + 1; j < tour.length - 1; j++) {
        const delta = at(i - 1, j) + at(i, j + 1) - at(i - 1, i) - at(j, j + 1);
        if (delta < -1e-9) {
          reverse(tour, i, j);
          improved = true;
        }
      }
    }

    // Or-opt: sposta blocchi di 1-3 tappe altrove.
    for (let length = 1; length <= 3 && !improved; length++) {
      for (let i = 1; i + length <= tour.length - 1; i++) {
        const removed =
          at(i - 1, i) + at(i + length - 1, i + length) - dist[tour[i - 1]][tour[i + length]];

        for (let j = 1; j < tour.length - 1; j++) {
          if (j >= i - 1 && j <= i + length) continue;

          const added = dist[tour[j - 1]][tour[i]] + dist[tour[i + length - 1]][tour[j]] - at(j - 1, j);
          if (added - removed < -1e-9) {
            const block = tour.splice(i, length);
            tour.splice(j > i ? j - length : j, 0, ...block);
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
    }
  }

  return tour.slice(1, -1);
}

function reverse(tour: number[], from: number, to: number): void {
  while (from < to) {
    [tour[from], tour[to]] = [tour[to], tour[from]];
    from++;
    to--;
  }
}
