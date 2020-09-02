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
  data() {
    return {
      price: 75,
      name: "Luxury Tax",
      active: false,
    };
  },
  computed: {
    ...mapGetters({
      isCurrentPlayer: "getSelfIsCurrentPlayer"
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
      if (this.isCurrentPlayer) this.$store.dispatch("luxuryTax");
    },
  },
};
</script>
