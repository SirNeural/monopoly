<template>
  <div class="space corner free-parking" :class="{ active: active }" @click="popup">
    <div class="container">
      <div class="name">Free</div>
      <div>
        <i class="drawing fa fa-car"></i>
      </div>
      <div class="name">Parking</div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
export default {
  data() {
    return {
      name: "Free Parking",
      color: "red-500",
      active: false,
    };
  },
  computed: {
    ...mapGetters({
      getProperty: "getProperty",
      player: "getCurrentPlayer",
    }),
    property() {
      return this.getProperty(this.name);
    },
    tax() {
      return this.$store.getters.getTax;
    },
    buttons() {
      let options = {};
      if (this.isCurrentPlayer && this.player.position == this.property.id) {
        options.ok = true;
      } else {
        options.cancel = true;
      }
      return options;
    },
  },
  methods: {
    action() {
      this.$store.dispatch("freeParking");
    },
    async popup() {
      const claim = await this.$swal({
        content: this.$strToHtml(
          `<div class="flex flex-row justify-center p-4"><i class="fa fa-car fa-5x text-${this.color}"></i></div>
                <div class="swal-title text-${this.color}">${this.name}</div>
                <div class="flex flex-col text-center">
                <div class="flex flex-row justify-center text-xl py-1 font-medium">
                            <div>
                            Claim $${this.tax} in free parking
                            </div>
                </div>
                </div>`
        ),
        className: "normal-case",
      });
      if (claim) this.action();
    },
  },
};
</script>
