<template>
  <div class="flex flex-col flex-wrap min-h-screen justify-around absolute right-0 m-8">
    <div class="flex flex-col items-end">
      <div
        class="flex flex-row normal-case select-none py-2"
        v-for="p in sortedPlayers"
        :key="p.username"
      >
        <span class="text-white text-lg">{{ p.username }}:</span>
        <span class="ml-1 text-white text-xl">${{ p.balance }}</span>
      </div>
    </div>
    <div class="text-lg text-white normal-case">
      <div v-if="lastRoll">
        Last Roll:
        {{ lastRoll ? Object.entries(lastRoll)[0][1].join(', ') : '' }}
      </div>
    </div>
    <div class="flex flex-col">
      <button class="p-2 select-none text-xl text-white" @click="joinRoom">Join Room</button>
      <button class="p-2 select-none text-xl text-white" @click="createRoom">Create Room</button>
      <button class="p-2 select-none text-xl text-white" @click="rollDice">Roll Dice</button>
      <button class="p-2 select-none text-xl text-white" @click="toggle3D">Toggle 3D</button>
      <button class="p-2 select-none text-xl text-white" @click="rotate">Rotate</button>
    </div>
  </div>
</template>
