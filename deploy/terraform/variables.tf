variable "region" {
  description = "OCI region; Always Free Ampere A1 capacity exists only in the home region."
  type        = string
}

variable "tenancy_ocid" {
  description = "OCID of the tenancy (the root compartment): the `tenancy` line in ~/.oci/config."
  type        = string
}

variable "compartment_ocid" {
  description = "OCID of the compartment every resource of the app is created in."
  type        = string
}
