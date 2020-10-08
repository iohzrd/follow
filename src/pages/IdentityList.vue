<template>
  <div v-if="identity" class="following-container">
    <q-card v-for="iden in identity.following_deep" :key="iden">
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
export default {
  name: "IdentityList",
  props: {
    identity: {
      type: Object,
      required: true,
    },
  },
  data: function () {
    return {};
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
  mounted: async function () {
    await this.identity.updateFollowing();
    console.log("following_deep");
    console.log(this.identity.following_deep);
  },
  methods: {},
};
</script>

<style scoped></style>
