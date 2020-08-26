<template>
  <div class="space fee luxury-tax" :class="{ active: active }" @click="popup">
    <div class="container">
      <div class="name">{{ name }}</div>
      <div>
        <i class="drawing fa fa-gem"></i>
      </div>
      <div class="instructions">Pay: ${{ price }}</div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
export default {
  inject: ["connection"],
  data() {
    return {
      price: 75,
      name: "Luxury Tax",
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
        text: "Pay $" + this.price,
        className: "normal-case",
        icon: "warning",
      });
      if (this.self == this.player.id) this.store.dispatch("luxuryTax");
    },
  },
};
</script>
