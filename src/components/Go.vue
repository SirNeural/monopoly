<template>
  <div class="space corner go" :class="{ active: active }" @click="popup">
    <div class="container">
      <div class="instructions">Collect $200.00 salary as you pass</div>
      <div class="go-word">go</div>
    </div>
    <div class="absolute">
      <i class="arrow relative fas fa-long-arrow-alt-left"></i>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      credit: 200,
      name: "Go",
      color: "red-500",
      active: false,
    };
  },
  methods: {
    async popup() {
      await this.$swal({
        content: this.$strToHtml(
          `<div class="flex flex-row items-center justify-around w-64 swal-title text-${this.color}"><div><i class="fas fa-long-arrow-alt-left fa-5x text-${this.color}"></i></div><div class="text-5xl">${this.name}</div></div>
                <div class="flex flex-col text-center">
                <div class="flex flex-row justify-center text-xl py-1 font-medium">
                            <div>
                            Collect $200 salary
                            </div>
                </div>
                </div>`
        ),
        className: "normal-case",
      });
    },
  },
};
</script>
