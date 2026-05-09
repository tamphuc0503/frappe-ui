export interface Codec<Domain, External> {
  decode(external: External): Domain
  encode(domain: Domain): External
}
