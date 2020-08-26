<template>
  <div class="space utility electric-company" :class="{ active: active }" @click="popup">
    <div class="container">
      <div class="name">{{ name }}</div>
      <div>
        <i :class="`drawing far fa-lightbulb text-${this.color}`"></i>
      </div>
      <div class="price">Buy: ${{ price }}</div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
export default {
  inject: ["connection"],
  data() {
    return {
      price: 150,
      mortgage: 75,
      name: "Electric Company",
      color: "yellow-200",
      active: false,
      owner: false,
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
      const buy = await this.$swal({
        content: this.$strToHtml(`
                <div class="flex flex-row justify-center p-4"><i class="far fa-lightbulb fa-5x text-${this.color}"></i></div>
                <div class="swal-title text-${this.color}">${this.name} - $${this.price}</div>
                <div class="flex flex-col text-center">
                            <div class="flex flex-row justify-between text-lg">
                            If one "Utility" is owned, rent is 4 times amount shown on dice.
                            </div>
                            <div class="flex flex-row justify-between text-lg py-1">
                            If both "Utilities" are owned, rent is 10 times amount shown on dice.
                            </div>
                            <div class="flex flex-row justify-center py-1 text-lg font-medium">
                            <div class="pr-4">
                            Mortgage Value:
                            </div>
                            <div>$${this.mortgage}</div>
                            </div>
                            </div>`),
        className: "normal-case",
        buttons: {
          cancel: true,
          [this.owner
            ? this.isCurrentPlayer
              ? "manage"
              : "rent"
            : "buy"]: true,
        },
      });
      if (!this.owner && this.isCurrentPlayer && buy) {
        this.$store.dispatch("buyProperty", {
          propertyName: this.name,
          address: this.player.id,
        });
        this.$swal({
          title: "Congratulations!",
          text: `You now own ${this.name}!`,
          icon: "success",
          className: "normal-case",
        });
      } else if (this.isCurrentPlayer && this.owner) {
        if (this.owner == this.self) {
          // house management
        } else {
          this.$swal({
            title: "Rent Paid!",
            text: `You have paid the rent due on ${this.name}!`,
            icon: "success",
            className: "normal-case",
          });
          this.$store.dispatch("rentUtility", {
            propertyName: this.name,
            address: this.player.id,
          });
        }
      } else {
        this.$swal({
          title: "Sorry!",
          text: `There was a problem purchasing ${this.name}!`,
          icon: "error",
          className: "normal-case",
        });
      }
    },
  },
};
</script>
