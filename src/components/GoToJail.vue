<template>
  <div class="space corner go-to-jail" :class="{ active: active }" @click="popup">
    <div class="container">
      <div class="name">Go To</div>
      <div>
        <i class="drawing fa fa-gavel"></i>
      </div>
      <div class="name">Jail</div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
export default {
  data() {
    return {
      name: "Go to Jail",
      color: "brown-500",
      active: false,
    };
  },
  computed: {
    ...mapGetters({
      getProperty: "getProperty",
      isCurrentPlayer: "getSelfIsCurrentPlayer",
    }),
    property() {
      return this.getProperty(this.name);
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
      if (this.isCurrentPlayer) this.$store.dispatch("jailPlayer");
    },
    async popup() {
      await this.$swal({
        content: this.$strToHtml(
          `<div class="flex flex-row justify-center p-4"><i class="fa fa-gavel fa-5x text-${this.color}"></i></div>
                <div class="swal-title text-${this.color}">${this.name}</div>
                <div class="flex flex-col text-center">
                <div class="flex flex-row justify-center text-xl py-1 font-medium">
                            <div>
                            Do not pass Go, do not collect $200
                            </div>
                </div>
                </div>`
        ),
        className: "normal-case",
      });
      this.action();
    },
  },
};
</script>
