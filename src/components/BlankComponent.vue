<template>
  <div id="app"></div>
</template>
<script>
// const { Identity } = require("../modules/identity");
export default {
  name: "BlankComponent",
  props: {
    id: {
      type: String,
      required: true
    }
  },
  data: function() {
    return {};
  },
  mounted: function() {},
  methods: {}
};
</script>
<style scoped></style>
