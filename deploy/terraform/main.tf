terraform {
  required_version = "1.17"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "9.12.1"
    }
  }
}

provider "oci" {
  config_file_profile = "DEFAULT"
  region              = var.region
}
