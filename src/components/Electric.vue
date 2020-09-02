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
import { PropertyStatus } from "../definitions/types";
export default {
  data() {
    return {
      price: 150,
      mortgage: 75,
      name: "Electric Company",
      color: "yellow-200",
      active: false,
    };
  },
  computed: {
    ...mapGetters({
      self: "getSelfAddress",
      player: "getCurrentPlayer",
      getProperty: "getProperty",
      propertyOwner: "getPropertyOwner",
      isCurrentPlayer: "getSelfIsCurrentPlayer",
    }),
    property() {
      return this.getProperty(this.name);
    },
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
        buttons: this.buttons,
      });
      if (!this.owner && this.isCurrentPlayer && buy) {
        if (this.player.balance.gte(this.price)) {
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
          const action = await this.$swal({
            title: "Property Management",
            className: "normal-case",
            icon: "info",
            buttons: {
              cancel: true,
              ...(this.property.status == PropertyStatus.Owned && {
                mortgage: true,
              }),
              ...(this.property.status == PropertyStatus.Mortgaged && {
                unmortgage: true,
              }),
            },
          });
          switch (action) {
            case "mortgage":
              this.$store.dispatch("mortgageProperty", this.name);
              break;
            case "unmortgage":
              this.$store.dispatch("unmortgageProperty", this.name);
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
          this.$store.dispatch("rentUtility", this.name);
        }
      }
    },
  },
};
</script>
