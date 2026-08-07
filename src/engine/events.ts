// Sorteio e resolução de eventos climáticos.
// O peso cresce com a temperatura (docs/GDD.md §4):
//   baseWeight * (1 + eventWeightPerDegree * max(0, T - tempThreshold))
// O sorteio usa o RNG semeado de rng.ts, nunca Math.random() (regra 7).
//
// Vazio de propósito. Quem implementa: P7-01.
