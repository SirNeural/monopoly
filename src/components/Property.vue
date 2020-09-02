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
      isCurrentPlayer: "getSelfIsCurrentPlayer",
    }),
    owner() {
      return this.propertyOwner(this.name);
    },
    buttons() {
      let options = {};
      options.cancel = true;
      if (this.isCurrentPlayer) {
        if (this.owner && this.owner == this.self) options.manage = true;
        else if (this.player.position == this.property.id) {
          if (!this.owner) {
            options.buy = true;
          } else {
            options.rent = true;
          }
        }
      }
      return options;
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
        buttons: this.buttons,
      });
      if (!this.owner && this.isCurrentPlayer && buy) {
        if (this.player.balance.gte(this.property.prices[0])) {
          this.$store.dispatch("buyProperty", this.name);
          this.$swal({
            title: "Congratulations!",
            text: `You now own ${this.name}!`,
            icon: "success",
            className: "normal-case",
          });
        } else {
          this.$swal({
            title: "Insufficient Funds!",
            text: `Sorry! You don't have enough money to purchase ${this.name}!`,
            icon: "error",
            className: "normal-case",
          });
        }
      } else if (this.isCurrentPlayer && this.owner) {
        if (this.owner == this.self && buy) {
          const action = this.$swal({
            title: "Property Management",
            className: "normal-case",
            icon: "info",
            buttons: {
              cancel: true,
              ...(this.property.status >= PropertyStatus.Monopoly &&
                this.propertyStatus != PropertyStatus.Mortgaged && {
                  addHouse: {
                    text: "+ House",
                  },
                }),
              ...(this.property.status >= PropertyStatus.Monopoly &&
                this.propertyStatus != PropertyStatus.Mortgaged && {
                  removeHouse: {
                    text: "- House",
                  },
                }),
              ...(this.property.status == PropertyStatus.Owned && {
                mortgage: true,
              }),
              ...(this.property.status == PropertyStatus.Mortgaged && {
                unmortgage: true,
              }),
            },
          });
          switch(action) {
            case 'mortgage':
                this.$store.dispatch('mortgageProperty', this.name);
                break;
            case 'unmortgage':
                this.$store.dispatch('unmortgageProperty', this.name);
                break;
            case 'addHouse':
                this.$store.dispatch('addHouse', this.name);
                break;
            case 'removeHouse':
                this.$store.dispatch('removeHouse', this.name);
                break;
          }
          this.$swal({
            title: "Success!",
            text: `You have modified ${this.name}!`,
            icon: "success",
            className: "normal-case",
          });
        } else {
          this.$swal({
            title: "Rent Paid!",
            text: `You have paid the rent due on ${this.name}!`,
            icon: "success",
            className: "normal-case",
          });
          this.$store.dispatch("rentProperty", this.name);
        }
      }
    },
  },
};
</script>
