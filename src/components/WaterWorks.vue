<template>
  <div class="space utility waterworks" :class="{ active: active }" @click="popup">
    <div class="container text-center">
      <div class="name">{{ name }}</div>
      <div>
        <svg
          :class="`w-16 h-16 text-${this.color} fill-current mx-auto`"
          viewBox="0 0 384.929 384.929"
          xml:space="preserve"
        >
          <g>
            <g>
              <path
                d="M350.246,191.25v-66.938c0-5.259-4.303-9.562-9.562-9.562h-19.125c-5.26,0-13.865,0-19.125,0s-13.865,0-19.125,0H248.08
            c-8.683-14.535-22.548-25.599-39.101-30.562c4.389-2.448,7.392-7.086,7.392-12.47c0-7.918-6.426-14.344-14.344-14.344h-4.781
            V38.25h43.031c7.918,0,14.344-6.426,14.344-14.344s-6.426-14.344-14.344-14.344h-43.031c0-5.278-3.185-9.562-9.562-9.562
            s-9.562,4.284-9.562,9.562h-43.031c-7.918,0-14.344,6.426-14.344,14.344s6.426,14.344,14.344,14.344h43.031v19.125h-4.781
            c-7.918,0-14.344,6.426-14.344,14.344c0,5.872,3.538,10.901,8.587,13.12c-11.867,3.959-22.271,11.064-30.255,20.349H63.371V76.5
            c0-10.566-8.559-19.125-19.125-19.125S25.121,65.934,25.121,76.5v143.438c0,10.566,8.559,19.125,19.125,19.125
            s19.125-8.559,19.125-19.125v-38.25h65.264c11.475,21.783,34.31,36.653,60.645,36.653c33.488,0,61.315-24.031,67.301-55.778
            h26.728c5.26,0,9.562,4.303,9.562,9.562v19.125c-5.26,0-9.562,4.303-9.562,9.562v19.125c0,5.26,4.303,9.562,9.562,9.562h57.375
            c5.26,0,9.562-4.303,9.562-9.562v-19.125C359.808,195.553,355.505,191.25,350.246,191.25z"
              />
              <path
                d="M279.722,344.881c0,22.118,17.93,40.048,40.048,40.048s40.038-17.93,40.038-40.048s-40.048-79.55-40.048-79.55
            S279.722,322.763,279.722,344.881z"
              />
            </g>
          </g>
        </svg>
      </div>
      <div class="price">Buy: ${{ price }}</div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
export default {
  data() {
    return {
      price: 150,
      mortgage: 70,
      name: "Waterworks",
      color: "blue-600",
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
                <div class="flex flex-row justify-center p-4"><svg
                    class="w-16 h-16 text-${this.color} fill-current"
                    viewBox="0 0 384.929 384.929"
                    xml:space="preserve"
                >
                    <g>
                        <g>
                            <path
                                d="M350.246,191.25v-66.938c0-5.259-4.303-9.562-9.562-9.562h-19.125c-5.26,0-13.865,0-19.125,0s-13.865,0-19.125,0H248.08
            c-8.683-14.535-22.548-25.599-39.101-30.562c4.389-2.448,7.392-7.086,7.392-12.47c0-7.918-6.426-14.344-14.344-14.344h-4.781
            V38.25h43.031c7.918,0,14.344-6.426,14.344-14.344s-6.426-14.344-14.344-14.344h-43.031c0-5.278-3.185-9.562-9.562-9.562
            s-9.562,4.284-9.562,9.562h-43.031c-7.918,0-14.344,6.426-14.344,14.344s6.426,14.344,14.344,14.344h43.031v19.125h-4.781
            c-7.918,0-14.344,6.426-14.344,14.344c0,5.872,3.538,10.901,8.587,13.12c-11.867,3.959-22.271,11.064-30.255,20.349H63.371V76.5
            c0-10.566-8.559-19.125-19.125-19.125S25.121,65.934,25.121,76.5v143.438c0,10.566,8.559,19.125,19.125,19.125
            s19.125-8.559,19.125-19.125v-38.25h65.264c11.475,21.783,34.31,36.653,60.645,36.653c33.488,0,61.315-24.031,67.301-55.778
            h26.728c5.26,0,9.562,4.303,9.562,9.562v19.125c-5.26,0-9.562,4.303-9.562,9.562v19.125c0,5.26,4.303,9.562,9.562,9.562h57.375
            c5.26,0,9.562-4.303,9.562-9.562v-19.125C359.808,195.553,355.505,191.25,350.246,191.25z"
                            />
                            <path
                                d="M279.722,344.881c0,22.118,17.93,40.048,40.048,40.048s40.038-17.93,40.038-40.048s-40.048-79.55-40.048-79.55
            S279.722,322.763,279.722,344.881z"
                            />
                        </g>
                    </g>
                </svg></div>
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
        this.$store.dispatch("buyProperty", this.name);
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
          this.$store.dispatch("rentUtility", this.name);
        }
      }
    },
  },
};
</script>
