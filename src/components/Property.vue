<template>
  <div class="space property" :class="{ active: active }" @click="popup">
    <div class="container text-center">
      <div :class="`color-bar h-8 bg-${property.color}`"></div>
      <div class="name">{{ name }}</div>
      <div class="price">Price: ${{ property.prices[0] }}</div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import { PropertyStatus } from "../definitions/types";
export default {
  data() {
    return {
      houses: 0,
      active: false,
    };
  },
  computed: {
    property() {
      return this.getProperty(this.name);
    },
    ...mapGetters({
      self: "getSelfAddress",
      player: "getCurrentPlayer",
      getProperty: "getProperty",
      monopolies: "getCurrentPlayerMonopolies",
      propertyOwner: "getPropertyOwner",
    }),
    owner() {
      return this.propertyOwner(this.name);
    },
    isCurrentPlayer() {
      return this.player.id == this.self;
    },
  },
  props: {
    name: String,
  },
  methods: {
    onActive() {},
    async popup() {
      const buy = await this.$swal({
        content: this.$strToHtml(`
                <div class="swal-title text-${this.property.color}">${
          this.name
        } - $${this.property.prices[0]}</div>
                <div class="flex flex-col text-center">
                            <div class="flex flex-row justify-between text-lg font-medium">
                            <div>
                            Rent:
                            </div>
                            <div>$${
                              this.property.status == PropertyStatus.Monopoly
                                ? this.property.prices[2]
                                : this.property.prices[1]
                            }</div>
                            </div>
                            <div class="flex flex-row justify-between py-1">
                            <div>
                            With one house:
                            </div>
                            <div>$${this.property.prices[3]}</div>
                            </div>
                            <div class="flex flex-row justify-between py-1">
                            <div>
                            With two houses:
                            </div>
                            <div>$${this.property.prices[4]}</div>
                            </div>
                            <div class="flex flex-row justify-between py-1">
                            <div>
                            With three houses:
                            </div>
                            <div>$${this.property.prices[5]}</div>
                            </div>
                            <div class="flex flex-row justify-between py-1">
                            <div>
                            With four houses:
                            </div>
                            <div>$${this.property.prices[6]}</div>
                            </div>
                            <div class="flex flex-row justify-between py-1">
                            <div>
                            With a hotel:
                            </div>
                            <div>$${this.property.prices[7]}</div>
                            </div>
                            <div class="flex flex-row justify-center py-1 text-lg font-medium">
                            <div class="pr-4">
                            Mortgage Value:
                            </div>
                            <div>$${this.property.prices[8]}</div>
                            </div>
                            <div class="flex flex-row justify-center pt-1 text-lg font-medium">
                            <div class="pr-4">
                            Houses Cost:
                            </div>
                            <div>$${this.property.housePrice}</div>
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
          this.$store.dispatch("rentProperty", {
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
