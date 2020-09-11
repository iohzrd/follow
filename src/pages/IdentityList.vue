<template>
  <div v-if="following_deep" class="following-container">
    <q-card v-for="iden in following_deep" :key="iden">
      <q-card-section>
        <div class="text">
          <router-link
            :identity="iden"
            :to="{ name: 'Identity', params: { identity: iden } }"
          >{{ iden.id }} - {{ iden.dn }}</router-link>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script>
// const { Identity } = require("../modules/identity");
export default {
  name: "IdentityList",
  props: {
    identity: {
      type: Object,
      required: true,
    },
  },
  data: function () {
    return {
      following_deep: [],
    };
  },
  watch: {
    "identity.following_deep": {
      deep: true,
      async handler(event) {
        this.following_deep = event;
        console.log(this.following_deep);
      },
    },
  },
  mounted: function () {
    this.following_deep = this.identity.following_deep;
    console.log(this.following_deep);
  },
  methods: {},
};
</script>

<style scoped></style>
