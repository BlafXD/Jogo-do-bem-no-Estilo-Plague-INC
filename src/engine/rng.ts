// RNG semeado (mulberry32). Mesma seed, mesma partida — é o que torna bug
// reproduzível e playtest confiável. Nenhum sorteio do jogo usa Math.random()
// (regra 7); o lint barra o uso.
//
// Vazio de propósito. Quem implementa: SETUP-06.
