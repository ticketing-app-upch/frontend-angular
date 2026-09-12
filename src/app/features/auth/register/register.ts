import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import {
  MatFormFieldModule,
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
} from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LegalDialog, LegalDoc } from '../../../shared/legal/legal-dialog';
import { DigitsOnly } from '../../../shared/digits-only';
import {
  CountryField,
  CountryPick,
} from '../../../shared/country-field/country-field';
import { flagEmoji, normalize } from '../../../shared/countries';
import {
  DocType,
  OrganizerType,
  PublicRole,
} from '../../../core/models/user.model';

const DOC_PATTERNS: Record<DocType, RegExp> = {
  DNI: /^\d{8}$/,
  CE: /^\d{9,12}$/,
  PASAPORTE: /^[A-Za-z0-9]{6,12}$/,
};

@Component({
  selector: 'tkt-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatSelectModule,
    MatProgressBarModule,
    DigitsOnly,
    CountryField,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  providers: [
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { subscriptSizing: 'dynamic', appearance: 'outline' },
    },
  ],
})
export class Register {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private notify = inject(NotificationService);
  private dialog = inject(MatDialog);

  readonly loading = signal(false);
  readonly hide = signal(true);

  readonly docTypes: DocType[] = ['DNI', 'CE', 'PASAPORTE'];
  readonly genders = [
    { value: 'F', label: 'Femenino' },
    { value: 'M', label: 'Masculino' },
  ];

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['CLIENT' as PublicRole, Validators.required],

    personal: this.fb.nonNullable.group({
      country: ['PE', Validators.required],
      hasPeruvianNationality: [false],
      city: ['', Validators.required],
      district: [''],
      docType: ['DNI' as DocType, Validators.required],
      docNumber: ['', [Validators.required, Validators.pattern(DOC_PATTERNS.DNI)]],
      gender: ['', Validators.required],
      // solo los dígitos del código; el "+" es fijo en la UI
      phoneCode: ['51', [Validators.required, Validators.pattern(/^\d{1,4}$/)]],
      phone: [
        '',
        [Validators.required, Validators.pattern(/^\d{6,17}$/), Validators.maxLength(17)],
      ],
    }),

    organizer: this.fb.nonNullable.group({
      orgType: ['EMPRESA' as OrganizerType, Validators.required],
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      taxId: ['', [Validators.required, Validators.pattern(/^(10|15|17|20)\d{9}$/)]],
      legalName: ['', Validators.required],
      phone: [
        '',
        [Validators.required, Validators.pattern(/^\d{6,17}$/), Validators.maxLength(17)],
      ],
      country: ['PE', Validators.required],
      city: ['', Validators.required],
      website: [
        '',
        Validators.pattern(/^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i),
      ],
    }),

    acceptedTerms: [false, Validators.requiredTrue],
    marketingOptIn: [false],
  });

  get personal() {
    return this.form.controls.personal;
  }
  get org() {
    return this.form.controls.organizer;
  }

  private readonly roleValue = toSignal(this.form.controls.role.valueChanges, {
    initialValue: this.form.controls.role.value,
  });
  readonly isOrganizer = computed(() => this.roleValue() === 'ORGANIZER');

  readonly firstNameLabel = computed(() =>
    this.isOrganizer() ? 'Nombre del responsable' : 'Nombre',
  );
  readonly lastNameLabel = computed(() =>
    this.isOrganizer() ? 'Apellidos del responsable' : 'Apellidos',
  );

  /** País del cliente resuelto por el autocompletar. */
  private readonly clientCountry = signal<CountryPick | null>(null);
  /** Hay país reconocido -> el código telefónico se autocompleta y se bloquea. */
  readonly codeAuto = computed(() => !!this.clientCountry()?.country);
  readonly countryFlag = computed(() =>
    flagEmoji(this.clientCountry()?.country?.code ?? ''),
  );

  private readonly orgTypeValue = toSignal(
    this.org.controls.orgType.valueChanges,
    { initialValue: this.org.controls.orgType.value },
  );

  private readonly orgCountryCode = toSignal(
    this.org.controls.country.valueChanges,
    { initialValue: this.org.controls.country.value },
  );
  /** El país de la organización es Perú. */
  readonly orgIsPeru = computed(() => this.orgCountryCode() === 'PE');
  readonly taxIdLabel = computed(() =>
    this.orgTypeValue() === 'PERSONA' ? 'DNI' : 'RUC',
  );

  readonly docTypeValue = toSignal(
    this.personal.controls.docType.valueChanges,
    { initialValue: this.personal.controls.docType.value },
  );
  readonly docPlaceholder = computed(() => {
    switch (this.docTypeValue()) {
      case 'DNI':
        return '8 dígitos';
      case 'CE':
        return '9 a 12 dígitos';
      default:
        return 'Ej.: X1234567';
    }
  });

  /** CE y DNI son numéricos; Pasaporte admite letras y números. */
  readonly isNumericDoc = computed(() => this.docTypeValue() !== 'PASAPORTE');

  /** Largo máximo del campo según el tipo de documento. */
  readonly docMaxLength = computed(() =>
    this.docTypeValue() === 'DNI' ? 8 : 12,
  );

  /** Nota de ayuda bajo el N° de documento. */
  readonly docHint = computed(() => {
    switch (this.docTypeValue()) {
      case 'DNI':
        return 'Documento Nacional de Identidad: 8 dígitos.';
      case 'CE':
        return 'Carné de Extranjería: entre 9 y 12 dígitos.';
      default:
        return 'Pasaporte: entre 6 y 12 caracteres (letras y números).';
    }
  });

  private readonly countryCode = toSignal(
    this.personal.controls.country.valueChanges,
    { initialValue: this.personal.controls.country.value },
  );
  private readonly peNationality = toSignal(
    this.personal.controls.hasPeruvianNationality.valueChanges,
    { initialValue: this.personal.controls.hasPeruvianNationality.value },
  );

  /** El país seleccionado es Perú. */
  readonly isPeru = computed(() => this.countryCode() === 'PE');

  /** Puede escribir ciudad/distrito: peruanos o extranjeros con nacionalidad peruana. */
  readonly canEditLocation = computed(() => this.isPeru() || this.peNationality());

  /** Tipos de documento disponibles según país / nacionalidad. */
  readonly allowedDocTypes = computed<DocType[]>(() => {
    if (this.isPeru() || this.peNationality()) {
      return ['DNI', 'CE', 'PASAPORTE'];
    }
    return ['CE', 'PASAPORTE'];
  });

  constructor() {
    this.applyRole(this.form.controls.role.value);

    this.form.controls.role.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((role) => this.applyRole(role));

    this.org.controls.orgType.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((type) => this.applyOrgTypeRules(type));

    this.personal.controls.docType.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((type) => {
        const ctrl = this.personal.controls.docNumber;
        ctrl.setValidators([
          Validators.required,
          Validators.pattern(DOC_PATTERNS[type]),
        ]);
        ctrl.updateValueAndValidity();
      });

    // País / nacionalidad -> ciudad+distrito opcionales para extranjeros y
    // ajuste de los tipos de documento permitidos.
    merge(
      this.personal.controls.country.valueChanges,
      this.personal.controls.hasPeruvianNationality.valueChanges,
      this.personal.controls.city.valueChanges,
    )
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.applyNationalityRules());
    this.applyNationalityRules();
  }

  private applyNationalityRules(): void {
    const p = this.personal.controls;
    const isPeru = p.country.value === 'PE';

    // Ciudad obligatoria solo en Perú; editables para peruanos o
    // extranjeros que declaran nacionalidad peruana.
    if (isPeru) {
      p.city.setValidators(Validators.required);
    } else {
      p.city.clearValidators();
    }
    const canEdit = isPeru || p.hasPeruvianNationality.value;
    if (canEdit) {
      p.city.enable({ emitEvent: false });
    } else {
      p.city.setValue('', { emitEvent: false });
      p.city.disable({ emitEvent: false });
    }
    p.city.updateValueAndValidity({ emitEvent: false });

    // Distrito solo aplica a Lima: si escriben otro departamento en Ciudad,
    // se bloquea y se limpia.
    const cityIsLima = normalize(p.city.value ?? '').trim() === 'lima';
    const districtOk = canEdit && (p.city.value.trim() === '' || cityIsLima);
    if (districtOk) {
      p.district.enable({ emitEvent: false });
    } else {
      p.district.setValue('', { emitEvent: false });
      p.district.disable({ emitEvent: false });
    }
    p.district.updateValueAndValidity({ emitEvent: false });

    // Al volver a Perú, la casilla de nacionalidad no aplica.
    if (isPeru && p.hasPeruvianNationality.value) {
      p.hasPeruvianNationality.setValue(false, { emitEvent: false });
    }

    // Si el tipo de documento actual ya no está permitido, cae al primero.
    const allowed = this.allowedDocTypes();
    if (!allowed.includes(p.docType.value)) {
      p.docType.setValue(allowed[0]);
    }
  }

  /** El autocompletar de país (cliente) resolvió un país o texto libre. */
  onClientCountry(pick: CountryPick): void {
    this.clientCountry.set(pick);
    this.personal.controls.country.setValue(
      pick.country?.code ?? pick.text.trim(),
    );
    if (pick.country) {
      this.personal.controls.phoneCode.setValue(pick.country.dial.replace('+', ''));
    }
  }

  /** El autocompletar de país (organizador). */
  onOrgCountry(pick: CountryPick): void {
    this.org.controls.country.setValue(pick.country?.code ?? pick.text.trim());
    this.applyOrgCountryRules();
  }

  /** Ciudad de la organización: editable y obligatoria sólo si el país es Perú. */
  private applyOrgCountryRules(): void {
    const city = this.org.controls.city;
    if (this.org.controls.country.value === 'PE') {
      city.setValidators(Validators.required);
      city.enable({ emitEvent: false });
    } else {
      city.clearValidators();
      city.setValue('', { emitEvent: false });
      city.disable({ emitEvent: false });
    }
    city.updateValueAndValidity({ emitEvent: false });
  }

  openLegal(doc: LegalDoc, event: Event): void {
    event.preventDefault();
    this.dialog.open(LegalDialog, {
      data: { key: doc },
      width: 'min(680px, 94vw)',
      maxWidth: '94vw',
      autoFocus: false,
      backdropClass: 'tkt-legal-backdrop',
      panelClass: 'tkt-legal-panel',
    });
  }

  /** Habilita sólo la rama del rol elegido (cliente o organizador). */
  private applyRole(role: string): void {
    if (role === 'ORGANIZER') {
      this.personal.disable({ emitEvent: false });
      this.org.enable({ emitEvent: false });
      // Reaplica el bloqueo de ciudad para organizaciones del extranjero.
      this.applyOrgCountryRules();
    } else {
      this.org.disable({ emitEvent: false });
      this.personal.enable({ emitEvent: false });
      // Reaplica el bloqueo de ciudad/distrito para extranjeros.
      this.applyNationalityRules();
    }
  }

  /** Lleva la vista al primer campo inválido (suele estar fuera de pantalla). */
  private focusFirstError(): void {
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(
        'form input.ng-invalid, form textarea.ng-invalid, form mat-select.ng-invalid, form mat-checkbox.ng-invalid',
      );
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'
        ? el
        : el.querySelector<HTMLElement>('input, button')
      )?.focus();
    });
  }

  private applyOrgTypeRules(type: OrganizerType): void {
    const taxId = this.org.controls.taxId;
    const legalName = this.org.controls.legalName;

    taxId.setValidators([
      Validators.required,
      Validators.pattern(type === 'PERSONA' ? /^\d{8}$/ : /^(10|15|17|20)\d{9}$/),
    ]);
    taxId.updateValueAndValidity();

    if (type === 'EMPRESA') {
      legalName.setValidators(Validators.required);
    } else {
      legalName.clearValidators();
      legalName.setValue('');
    }
    legalName.updateValueAndValidity();
  }

  submit(): void {
    if (this.loading()) return;

    const baseValid =
      this.form.controls.firstName.valid &&
      this.form.controls.lastName.valid &&
      this.form.controls.email.valid &&
      this.form.controls.password.valid &&
      this.form.controls.acceptedTerms.valid;
    const branchValid = this.isOrganizer()
      ? this.org.valid
      : this.personal.valid;

    if (!baseValid || !branchValid) {
      this.form.markAllAsTouched();
      this.notify.error('Revisa los campos marcados en rojo.');
      this.focusFirstError();
      return;
    }
    const raw = this.form.getRawValue();
    const fullName = `${raw.firstName.trim()} ${raw.lastName.trim()}`.trim();
    this.loading.set(true);

    this.auth
      .register({
        fullName,
        email: raw.email,
        password: raw.password,
        role: raw.role,
        acceptedTerms: raw.acceptedTerms,
        marketingOptIn: raw.marketingOptIn,
        profile:
          raw.role === 'CLIENT'
            ? {
                country: raw.personal.country,
                city: raw.personal.city.trim(),
                district: raw.personal.district.trim(),
                hasPeruvianNationality:
                  raw.personal.country === 'PE'
                    ? true
                    : raw.personal.hasPeruvianNationality,
                docType: raw.personal.docType,
                docNumber: raw.personal.docNumber.trim().toUpperCase(),
                gender: raw.personal.gender as never,
                phoneCode: `+${raw.personal.phoneCode}`,
                phone: raw.personal.phone.trim(),
              }
            : undefined,
        organizer:
          raw.role === 'ORGANIZER'
            ? {
                orgType: raw.organizer.orgType,
                displayName: raw.organizer.displayName.trim(),
                taxId: raw.organizer.taxId.trim(),
                legalName: raw.organizer.legalName.trim(),
                // el responsable es la persona que abre la cuenta
                repName: fullName,
                phone: raw.organizer.phone.trim(),
                country: raw.organizer.country,
                city: raw.organizer.city.trim(),
                website: raw.organizer.website.trim(),
              }
            : undefined,
      })
      .subscribe({
        next: (res) => {
          this.notify.success(
            `Cuenta creada. ¡Bienvenido, ${res.user.fullName.split(' ')[0]}!`,
          );
          this.router.navigateByUrl(
            res.user.role === 'ORGANIZER' ? '/organizador/panel' : '/eventos',
          );
        },
        error: (err) => {
          this.loading.set(false);
          this.notify.error(err?.message ?? 'No se pudo crear la cuenta.');
        },
      });
  }
}
