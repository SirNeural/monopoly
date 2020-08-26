<template>
  <div class="space fee income-tax" :class="{ active: active }" @click="popup">
    <div class="container">
      <div class="name">{{ name }}</div>
      <div class="diamond"></div>
      <div class="instructions">
        Pay 10%
        <br />or
        <br />
        ${{ price }}
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
export default {
  inject: ["connection"],
  data() {
    return {
      price: 200,
      name: "Income Tax",
      active: false,
    };
  },
  computed: {
    ...mapGetters({
      self: "getSelfAddress",
      player: "getCurrentPlayer",
    }),
  },
  methods: {
    async popup() {
      await this.$swal({
        title: this.name,
        text: "Pay 10% of net worth or $" + this.price,
        className: "normal-case",
        icon: "warning",
      });
      if (this.self == this.player.id) this.$store.dispatch("incomeTax");
    },
  },
};
</script>
