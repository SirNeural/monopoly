<template>
  <div class="space property" :class="{ active: active }" @click="popup">
    <div class="container text-center">
      <div :class="`color-bar h-8 bg-${property.color}`"></div>
      <div class="name">{{ name }}</div>
      <div class="price">Price: ${{ property.price }}</div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
export default {
  data() {
    return {
      houses: 0,
      active: false
    };
  },
  computed: {
    property() {
      return this.getProperty(this.name);
    },
    ...mapGetters({
      player: "getCurrentPlayer",
      getProperty: "getProperty",
      monopolies: "getCurrentPlayerMonopolies",
      propertyOwner: "getPropertyOwner"
    }),
    owner() {
      return this.propertyOwner(this.name);
    },
    isMonopoly() {
      return this.monopolies[this.property.color];
    }
  },
  props: {
    name: String
  },
  methods: {
    onActive() {},
    async popup() {
      const buy = await this.$swal({
        content: this.$strToHtml(`
                <div class="swal-title text-${this.property.color}">${
          this.name
        } - $${this.property.price}</div>
                <div class="flex flex-col text-center">
                            <div class="flex flex-row justify-between text-lg font-medium">
                            <div>
                            Rent:
                            </div>
                            <div>$${this.property.rent[this.houses]}</div>
                            </div>
                            <div class="flex flex-row justify-between py-1">
                            <div>
                            With one house:
                            </div>
                            <div>$${this.property.rent[1]}</div>
                            </div>
                            <div class="flex flex-row justify-between py-1">
                            <div>
                            With two houses:
                            </div>
                            <div>$${this.property.rent[2]}</div>
                            </div>
                            <div class="flex flex-row justify-between py-1">
                            <div>
                            With three houses:
                            </div>
                            <div>$${this.property.rent[3]}</div>
                            </div>
                            <div class="flex flex-row justify-between py-1">
                            <div>
                            With four houses:
                            </div>
                            <div>$${this.property.rent[4]}</div>
                            </div>
                            <div class="flex flex-row justify-between py-1">
                            <div>
                            With a hotel:
                            </div>
                            <div>$${this.property.rent[5]}</div>
                            </div>
                            <div class="flex flex-row justify-center py-1 text-lg font-medium">
                            <div class="pr-4">
                            Mortgage Value:
                            </div>
                            <div>$${this.property.mortgage}</div>
                            </div>
                            <div class="flex flex-row justify-center pt-1 text-lg font-medium">
                            <div class="pr-4">
                            Houses Cost:
                            </div>
                            <div>$${this.property.house}</div>
                            </div>
                            </div>`),
        className: "normal-case",
        buttons: {
          cancel: this.owner ? "Manage" : "Auction",
          [this.owner ? "rent" : "buy"]: true
        }
      });
      if (buy) {
        this.$store.dispatch("buyProperty", {
          propertyName: this.name,
          username: this.player.username
        });
        this.$swal({
          title: "Congratulations!",
          text: `You now own ${this.name}!`,
          icon: "success",
          className: "normal-case"
        });
      } else {
        //auction
      }
    }
  }
};
</script>
