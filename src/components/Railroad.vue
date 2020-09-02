<template>
  <div class="space railroad" :class="{ active: active }" @click="popup">
    <div class="container">
      <div :class="(long ? 'px-0 ' : '') + 'name'">{{ name }}</div>
      <div class="flex flex-row justify-center">
        <svg
          class="w-12 h-12 text-gray-800 fill-current"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 224 224"
        >
          <g>
            <path d="M0,224v-224h224v224z" fill="none" />
            <g>
              <g id="surface1">
                <path
                  d="M9.42308,25.84615c-5.18269,0 -9.42308,4.24039 -9.42308,9.42308v6.19231c-0.06731,0.53846 -0.06731,1.07692 0,1.61538v86.15385c0,0.26923 0,0.53846 0,0.80769v36.34615c0,7.74039 6.79808,14.53846 14.53846,14.53846h2.96154c2.22116,23.89424 22.71635,43.07692 47.11538,43.07692c18.94712,0 35.33654,-11.10576 43.07692,-27.46154c7.74039,16.35577 24.12981,27.46154 43.07692,27.46154c24.39904,0 44.89424,-19.18269 47.11538,-43.07692h17.5c8.61538,0 8.61538,-8.61538 8.61538,-8.61538l-13.46154,-13.46154c3.09615,-5.95673 4.84615,-12.82211 4.84615,-20.19231v-0.80769c0,-24.12981 -18.94712,-43.07692 -43.07692,-43.07692v-17.23077h-34.46154v17.23077h-43.07692v-43.88462c4.87981,-1.88462 8.61538,-6.73077 8.61538,-12.11538c0,-6.89904 -6.02404,-12.92308 -12.92308,-12.92308zM137.84615,43.07692l-3.5,3.5c-2.59134,3.4327 -3.33173,7.80769 -1.61538,12.11538l5.11538,10.23077h34.46154l5.11538,-10.23077c1.71635,-4.30769 1.81731,-8.68269 -1.61538,-12.11538l-3.5,-3.5zM17.23077,51.69231h60.30769v43.07692h-60.30769zM64.61538,146.46154c12.28365,0 22.37981,7.03365 26.92308,17.23077h-15.61538c-3.02884,-2.65866 -7,-4.30769 -11.30769,-4.30769c-9.49038,0 -17.23077,7.74039 -17.23077,17.23077c0,9.49039 7.74039,17.23077 17.23077,17.23077c8.00962,0 14.77404,-5.51923 16.69231,-12.92308h52.76923c1.91827,7.40385 8.6827,12.92308 16.69231,12.92308c9.49039,0 17.23077,-7.74038 17.23077,-17.23077c0,-9.49038 -7.74038,-17.23077 -17.23077,-17.23077c-4.30769,0 -8.27884,1.64904 -11.30769,4.30769h-16.42308c4.71154,-10.19712 15.3125,-17.23077 26.92308,-17.23077c16.35577,0 30.15385,13.79808 30.15385,30.15385c0.875,16.35577 -12.99038,30.15385 -29.34615,30.15385c-12.04807,0 -22.34615,-6.89904 -26.65385,-17.23077h-32.03846c-5.18269,10.33173 -15.44712,17.23077 -26.65385,17.23077c-17.23077,0 -30.96154,-13.79807 -30.96154,-30.15385c0,-16.35576 13.79808,-30.15385 30.15385,-30.15385z"
                />
              </g>
            </g>
          </g>
        </svg>
      </div>
      <div class="price">Price: ${{ price }}</div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
export default {
  props: { name: String, long: Boolean },
  data() {
    return {
      price: 200,
      mortgage: 100,
      rent: [25, 50, 100, 200],
      color: "gray-800",
      active: false,
    };
  },
  computed: {
    ...mapGetters({
      self: "getSelfAddress",
      player: "getCurrentPlayer",
      getProperty: "getProperty",
      propertyOwner: "getPropertyOwner",
      currentPlayerPosition: "getCurrentPlayerPosition",
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
                <div class="flex flex-row justify-center p-4"><svg
                    class="w-16 h-16 text-${this.color} fill-current"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 224 224"
                >
                    <g
                    >
                        <path d="M0,224v-224h224v224z" fill="none"></path>
                        <g>
                            <g id="surface1">
                                <path
                                    d="M9.42308,25.84615c-5.18269,0 -9.42308,4.24039 -9.42308,9.42308v6.19231c-0.06731,0.53846 -0.06731,1.07692 0,1.61538v86.15385c0,0.26923 0,0.53846 0,0.80769v36.34615c0,7.74039 6.79808,14.53846 14.53846,14.53846h2.96154c2.22116,23.89424 22.71635,43.07692 47.11538,43.07692c18.94712,0 35.33654,-11.10576 43.07692,-27.46154c7.74039,16.35577 24.12981,27.46154 43.07692,27.46154c24.39904,0 44.89424,-19.18269 47.11538,-43.07692h17.5c8.61538,0 8.61538,-8.61538 8.61538,-8.61538l-13.46154,-13.46154c3.09615,-5.95673 4.84615,-12.82211 4.84615,-20.19231v-0.80769c0,-24.12981 -18.94712,-43.07692 -43.07692,-43.07692v-17.23077h-34.46154v17.23077h-43.07692v-43.88462c4.87981,-1.88462 8.61538,-6.73077 8.61538,-12.11538c0,-6.89904 -6.02404,-12.92308 -12.92308,-12.92308zM137.84615,43.07692l-3.5,3.5c-2.59134,3.4327 -3.33173,7.80769 -1.61538,12.11538l5.11538,10.23077h34.46154l5.11538,-10.23077c1.71635,-4.30769 1.81731,-8.68269 -1.61538,-12.11538l-3.5,-3.5zM17.23077,51.69231h60.30769v43.07692h-60.30769zM64.61538,146.46154c12.28365,0 22.37981,7.03365 26.92308,17.23077h-15.61538c-3.02884,-2.65866 -7,-4.30769 -11.30769,-4.30769c-9.49038,0 -17.23077,7.74039 -17.23077,17.23077c0,9.49039 7.74039,17.23077 17.23077,17.23077c8.00962,0 14.77404,-5.51923 16.69231,-12.92308h52.76923c1.91827,7.40385 8.6827,12.92308 16.69231,12.92308c9.49039,0 17.23077,-7.74038 17.23077,-17.23077c0,-9.49038 -7.74038,-17.23077 -17.23077,-17.23077c-4.30769,0 -8.27884,1.64904 -11.30769,4.30769h-16.42308c4.71154,-10.19712 15.3125,-17.23077 26.92308,-17.23077c16.35577,0 30.15385,13.79808 30.15385,30.15385c0.875,16.35577 -12.99038,30.15385 -29.34615,30.15385c-12.04807,0 -22.34615,-6.89904 -26.65385,-17.23077h-32.03846c-5.18269,10.33173 -15.44712,17.23077 -26.65385,17.23077c-17.23077,0 -30.96154,-13.79807 -30.96154,-30.15385c0,-16.35576 13.79808,-30.15385 30.15385,-30.15385z"
                                ></path>
                            </g>
                        </g>
                    </g>
                </svg></div>
                <div class="swal-title text-${this.color}">${this.name} - $${this.price}</div>
                <div class="flex flex-col text-center">
                            <div class="flex flex-row justify-between text-lg font-medium">
                            <div>
                            Rent:
                            </div>
                            <div>$${this.rent[0]}</div>
                            </div>
                            <div class="flex flex-row justify-between py-1">
                            <div>
                            If 2 Railroads are owned:
                            </div>
                            <div>$${this.rent[1]}</div>
                            </div>
                            <div class="flex flex-row justify-between py-1">
                            <div>
                            If 3 Railroads are owned:
                            </div>
                            <div>$${this.rent[2]}</div>
                            </div>
                            <div class="flex flex-row justify-between py-1">
                            <div>
                            If 4 Railroads are owned:
                            </div>
                            <div>$${this.rent[3]}</div>
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
        if (this.owner == this.self) {
          // house management
        } else {
          this.$swal({
            title: "Rent Paid!",
            text: `You have paid the rent due on ${this.name}!`,
            icon: "success",
            className: "normal-case",
          });
          this.$store.dispatch("rentRailroad", this.name);
        }
      }
    },
  },
};
</script>
